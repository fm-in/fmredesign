/**
 * Lead Management API Routes
 * Handles CRUD operations for leads (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { captureMeta } from '@/lib/capture-meta';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { createLeadSchema, validateBody } from '@/lib/validations/schemas';
import { notifyTeam, newLeadEmail } from '@/lib/email/send';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { notifyAdmins } from '@/lib/notifications';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';
import { escapeSearchTerm } from '@/lib/postgrest';
import { changeStage } from '@/lib/sales/activity';
import { isLeadStatus } from '@/lib/sales/types';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { IntakeError } from '@/lib/sales/errors';
import { ApiResponse } from '@/lib/api-response';
import { canAccessLead } from '@/lib/sales/access';

// GET /api/leads - Fetch leads with optional filtering and sorting
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination: only active when `page` param is provided (backwards compat)
    const pageParam = searchParams.get('page');
    const isPaginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '25', 10)));

    const supabase = getSupabaseAdmin();

    // Non-admin users only see their assigned leads
    const isAdmin = auth.user.role === 'super_admin' || auth.user.role === 'admin';
    const myLeadsOnly = !isAdmin;

    // Shared filter params
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const sourceFilter = searchParams.get('source');
    const projectTypeFilter = searchParams.get('projectType');
    const budgetRangeFilter = searchParams.get('budgetRange');
    const companySizeFilter = searchParams.get('companySize');
    const assignedToFilter = myLeadsOnly ? null : searchParams.get('assignedTo');
    const currentUserId = auth.user.id;
    const scopedOwnerId = myLeadsOnly ? currentUserId : null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('search');
    const searchTerm = searchQuery ? escapeSearchTerm(searchQuery) : '';
    const ownerFilter = searchParams.get('owner');

    // Sorting
    const sortBy = searchParams.get('sortBy');
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const sortFieldMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      leadScore: 'lead_score',
      companySize: 'company_size',
      budgetRange: 'budget_range',
      projectType: 'project_type',
      followUpDate: 'follow_up_date',
    };
    const dbSortField = sortBy ? (sortFieldMap[sortBy] || sortBy) : 'created_at';

    /** Apply shared filters to a query builder */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyFilters(q: any) {
      if (statusFilter) q = q.in('status', statusFilter.split(','));
      if (priorityFilter) q = q.in('priority', priorityFilter.split(','));
      if (sourceFilter) q = q.in('source', sourceFilter.split(','));
      if (projectTypeFilter) q = q.in('project_type', projectTypeFilter.split(','));
      if (budgetRangeFilter) q = q.in('budget_range', budgetRangeFilter.split(','));
      if (companySizeFilter) q = q.in('company_size', companySizeFilter.split(','));
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter.split(','));
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) q = q.lte('created_at', endDate);
      // Managers see the leads they own plus unassigned ones.
      if (scopedOwnerId) q = q.or(`owner_id.eq.${scopedOwnerId},owner_id.is.null`);
      if (ownerFilter === 'mine') q = q.eq('owner_id', currentUserId);
      if (ownerFilter === 'unassigned') q = q.is('owner_id', null);
      if (searchTerm) {
        q = q.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,project_description.ilike.%${searchTerm}%`
        );
      }
      return q;
    }

    let data;
    let totalItems = 0;

    if (isPaginated) {
      // Get total count with same filters
      const { count, error: countError } = await applyFilters(
        supabase.from('leads').select('*', { count: 'exact', head: true })
      );
      if (countError) throw countError;
      totalItems = count || 0;

      // Paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = applyFilters(supabase.from('leads').select('*'));
      query = query.order(dbSortField, { ascending: sortDirection === 'asc' });
      query = query.range(from, to);
      const result = await query;
      if (result.error) throw result.error;
      data = result.data;
    } else {
      let query = applyFilters(supabase.from('leads').select('*'));
      query = query.order(dbSortField, { ascending: sortDirection === 'asc' });
      const result = await query;
      if (result.error) throw result.error;
      data = result.data;
    }

    // Transform to camelCase for frontend
    const leadDefaults = { additionalChallenges: [], tags: [], customFields: {} };
    const leads = (data || []).map((row: Record<string, unknown>) => ({
      ...toCamelCaseKeys(row, leadDefaults),
      leadSource: 'website',
    }));

    // For non-admin users, also fetch their assigned scraped contacts
    let scrapedAsLeads: Record<string, unknown>[] = [];
    if (myLeadsOnly) {
      const { data: scrapedData } = await supabase
        .from('scraped_contacts')
        .select('*')
        .eq('assigned_to', auth.user.name)
        .order('created_at', { ascending: false });

      scrapedAsLeads = (scrapedData || []).map((row) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company_name || '',
        email: row.email,
        phone: row.phone || row.mobile,
        company: row.company_name,
        source: row.source_platform,
        status: row.status === 'new' ? 'new' : row.status === 'contacted' ? 'contacted' : row.status,
        priority: row.notes?.includes('PRIORITY: HIGH') ? 'hot' : row.notes?.includes('PRIORITY: MEDIUM') ? 'warm' : 'cool',
        leadScore: row.notes?.includes('PRIORITY: HIGH') ? 80 : row.notes?.includes('PRIORITY: MEDIUM') ? 50 : 30,
        notes: row.notes || '',
        tags: row.tags || [],
        website: row.website,
        city: row.city,
        state: row.state,
        country: row.country,
        projectType: row.category || 'other',
        projectDescription: row.business_description || '',
        budgetRange: 'not_specified',
        timeline: 'not_specified',
        companySize: '',
        primaryChallenge: '',
        additionalChallenges: [],
        customFields: {},
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        leadSource: 'scraped',
        projectTag: row.project_tag,
        socialLinks: row.social_links,
        profileUrl: row.profile_url,
        businessDescription: row.business_description || '',
      }));
    }

    const allLeads = [...leads, ...scrapedAsLeads];

    const responseBody: Record<string, unknown> = {
      success: true,
      data: allLeads,
      total: isPaginated ? totalItems + scrapedAsLeads.length : allLeads.length,
    };

    if (isPaginated) {
      responseBody.pagination = {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      };
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a lead from a public form (or the admin Add Lead modal)
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (!rateLimit(clientIp, 5)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json();

    const spam = checkSpam({
      honeypot: rawBody?.[HONEYPOT_FIELD],
      email: typeof rawBody?.email === 'string' ? rawBody.email : undefined,
      name: typeof rawBody?.name === 'string' ? rawBody.name : undefined,
    });
    if (spam.isSpam) {
      console.warn('[leads] rejected submission:', spam.reason);
      return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
    }

    const validation = validateBody(createLeadSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = validation.data;
    const meta = captureMeta(request);
    const nowIso = new Date().toISOString();

    // Public forms send the consent text they displayed. The admin modal does
    // not, and a lead typed in by staff must never be emailed automatically.
    const fromPublicForm = Boolean(body.consentText);
    const formName = typeof body.customFields?.formName === 'string' ? body.customFields.formName : undefined;

    const { leadId, created } = await ingestLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      website: body.website,
      jobTitle: body.jobTitle,
      message: body.projectDescription,
      // A public request cannot choose its source. No admin screen posts one either
      // (the Add Lead modal sends none), so every submission here is a website form.
      source: 'website_form',
      sourceDetail: formName,
      attribution: body.attribution,
      consent: fromPublicForm
        ? {
            basis: 'inbound_request',
            evidence: { consentText: body.consentText, formName: formName ?? null, ip: meta.ip_address, page: request.headers.get('referer') },
            capturedAt: nowIso,
          }
        : { basis: 'none', evidence: { enteredBy: 'admin' }, capturedAt: nowIso },
      customFields: body.customFields,
      projectType: body.projectType,
      budgetRange: body.budgetRange,
      timeline: body.timeline,
      companySize: body.companySize,
      industry: body.industry,
      primaryChallenge: body.primaryChallenge,
      additionalChallenges: body.additionalChallenges,
      specificRequirements: body.specificRequirements,
      ipAddress: meta.ip_address,
      userAgent: meta.user_agent,
    });

    if (created) {
      await announceNewLead(leadId);
    }

    // Only the id of a lead this request created. A merge answers { id: null }:
    // a public form must never reveal a record someone else submitted.
    return created ? ApiResponse.success({ id: leadId }, undefined, 201) : ApiResponse.success({ id: null });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error creating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 });
  }
}

/** Tell the team about a new lead. Never fails the submission. */
async function announceNewLead(leadId: string): Promise<void> {
  const { data: row, error } = await getSupabaseAdmin().from('leads').select('*').eq('id', leadId).single();
  if (error || !row) {
    console.error('[leads] could not load the new lead to notify the team:', error?.message);
    return;
  }

  notifyAdmins({
    type: 'general',
    title: 'New lead received',
    message: `${row.name} — ${row.company || 'No company'}`,
    priority: 'high',
    actionUrl: `/admin/leads/${leadId}`,
  });

  const emailData = newLeadEmail({
    name: row.name,
    email: row.email ?? '',
    company: row.company ?? 'Not given',
    projectType: row.project_type ?? undefined,
    budgetRange: row.budget_range ?? undefined,
    timeline: row.timeline ?? undefined,
    primaryChallenge: row.primary_challenge ?? undefined,
    leadScore: row.lead_score ?? undefined,
    priority: row.priority ?? undefined,
  });
  notifyTeam(emailData.subject, emailData.html);
}

// DELETE /api/leads - Delete lead
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'super_admin' && auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Only admins can delete leads' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete lead' }, { status: 500 });
    }

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'lead',
      resource_id: id,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}

// PUT /api/leads - Update lead
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;

    // Map camelCase fields to snake_case for Supabase
    // Ownership changes only through PATCH /api/admin/sales/leads/[id], which checks who may assign.
    const updates: Record<string, unknown> = {};
    if (updateData.nextAction !== undefined) updates.next_action = updateData.nextAction;
    if (updateData.followUpDate !== undefined) updates.follow_up_date = updateData.followUpDate;
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    if (updateData.tags !== undefined) updates.tags = updateData.tags;
    if (updateData.priority !== undefined) updates.priority = updateData.priority;
    if (updateData.leadScore !== undefined) updates.lead_score = updateData.leadScore;
    if (updateData.customFields !== undefined) updates.custom_fields = updateData.customFields;
    if (updateData.convertedToClientAt !== undefined) updates.converted_to_client_at = updateData.convertedToClientAt;
    if (updateData.clientId !== undefined) updates.client_id = updateData.clientId;

    const supabase = getSupabaseAdmin();

    const { data: existing, error: existingError } = await supabase.from('leads').select('id, owner_id').eq('id', id).maybeSingle();
    if (existingError) throw existingError;
    // A manager may change only the leads they can see: their own and unassigned ones.
    if (!existing || !canAccessLead(auth.user, existing)) {
      return ApiResponse.notFound('Lead not found');
    }

    if (updateData.status !== undefined) {
      if (!isLeadStatus(updateData.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      await changeStage(id, updateData.status, { id: auth.user.id, name: auth.user.name });
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('leads').update(updates).eq('id', id);
      if (updateError) throw updateError;
    }

    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error) throw error;

    // Transform response
    const updatedLead = toCamelCaseKeys(data);

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'lead',
      resource_id: id,
      details: { updatedFields: Object.keys(updates), newStatus: updateData.status },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Lead updated successfully',
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}
