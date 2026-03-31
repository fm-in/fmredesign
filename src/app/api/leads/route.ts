/**
 * Lead Management API Routes
 * Handles CRUD operations for leads (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calculateLeadScore, determineLeadPriority, toCamelCaseKeys } from '@/lib/supabase-utils';
import type { LeadInput } from '@/lib/admin/lead-types';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { requireAdminAuth, requirePermission } from '@/lib/admin-auth-middleware';
import { createLeadSchema, validateBody } from '@/lib/validations/schemas';
import { notifyTeam, newLeadEmail } from '@/lib/email/send';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { notifyAdmins } from '@/lib/notifications';
import { emitEvent } from '@/lib/events/emitter';

// GET /api/leads - Fetch leads with optional filtering and sorting
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.read');
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
    const assignedToFilter = myLeadsOnly ? auth.user.name : searchParams.get('assignedTo');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('search');

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
      if (searchQuery) {
        q = q.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,project_description.ilike.%${searchQuery}%`
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
    const leads = (data || []).map((row: Record<string, unknown>) =>
      toCamelCaseKeys(row, leadDefaults)
    );

    const responseBody: Record<string, unknown> = {
      success: true,
      data: leads,
      total: isPaginated ? totalItems : leads.length,
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

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    if (!rateLimit(clientIp, 5)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json();
    const validation = validateBody(createLeadSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = rawBody;

    const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '');

    const leadInput: LeadInput = {
      name: stripHtml(body.name.trim()),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim(),
      company: stripHtml(body.company.trim()),
      website: body.website?.trim(),
      jobTitle: body.jobTitle ? stripHtml(body.jobTitle.trim()) : undefined,
      companySize: body.companySize,
      industry: body.industry,
      projectType: body.projectType,
      projectDescription: stripHtml(body.projectDescription.trim()),
      budgetRange: body.budgetRange,
      timeline: body.timeline,
      primaryChallenge: stripHtml(body.primaryChallenge.trim()),
      additionalChallenges: body.additionalChallenges
        ?.filter((c: string) => c.trim())
        .map((c: string) => stripHtml(c)),
      specificRequirements: body.specificRequirements
        ? stripHtml(body.specificRequirements.trim())
        : undefined,
      source: body.source || 'website_form',
      customFields: body.customFields || {},
    };

    // Calculate lead score and priority
    const leadScore = calculateLeadScore({
      budgetRange: leadInput.budgetRange,
      timeline: leadInput.timeline,
      companySize: leadInput.companySize,
      industry: leadInput.industry,
      primaryChallenge: leadInput.primaryChallenge,
    });
    const priority = determineLeadPriority(leadScore);

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const leadId = `lead_${timestamp}_${random}`;

    const record = {
      id: leadId,
      name: leadInput.name,
      email: leadInput.email,
      phone: leadInput.phone || null,
      company: leadInput.company,
      website: leadInput.website || null,
      job_title: leadInput.jobTitle || null,
      company_size: leadInput.companySize,
      industry: leadInput.industry || null,
      project_type: leadInput.projectType,
      project_description: leadInput.projectDescription,
      budget_range: leadInput.budgetRange,
      timeline: leadInput.timeline,
      primary_challenge: leadInput.primaryChallenge,
      additional_challenges: leadInput.additionalChallenges || [],
      specific_requirements: leadInput.specificRequirements || null,
      status: 'new',
      priority,
      source: leadInput.source || 'website_form',
      lead_score: leadScore,
      tags: [],
      notes: '',
      custom_fields: leadInput.customFields || {},
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('leads').insert(record).select().single();

    if (error) throw error;

    // Fire-and-forget: notify admins about new lead
    notifyAdmins({
      type: 'general',
      title: 'New lead received',
      message: `${record.name} — ${record.company || 'No company'}`,
      priority: 'high',
      actionUrl: '/admin/leads',
    });

    // Fire-and-forget email notification
    const emailData = newLeadEmail({
      name: record.name,
      email: record.email,
      company: record.company,
      projectType: record.project_type,
      budgetRange: record.budget_range,
      timeline: record.timeline,
      primaryChallenge: record.primary_challenge,
      leadScore,
      priority,
    });
    notifyTeam(emailData.subject, emailData.html);

    // Build camelCase response
    const lead = toCamelCaseKeys(data);

    return NextResponse.json(
      { success: true, data: lead, message: 'Lead created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads - Delete lead
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.delete');
  if ('error' in auth) return auth.error;

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
  const auth = await requirePermission(request, 'clients.write');
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
    const updates: Record<string, unknown> = {};
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.assignedTo !== undefined) updates.assigned_to = updateData.assignedTo;
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

    // Fetch previous status before update (for status change detection)
    let previousStatus: string | null = null;
    if (updateData.status !== undefined) {
      const { data: existing } = await supabase
        .from('leads')
        .select('status')
        .eq('id', id)
        .single();
      previousStatus = existing?.status ?? null;
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

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

    // Emit event when lead status changes (triggers outgoing webhooks → AgentWorks)
    if (
      updateData.status !== undefined &&
      previousStatus !== null &&
      updateData.status !== previousStatus
    ) {
      emitEvent('lead.status_changed', {
        entityId: id,
        actor: { id: auth.user.id, name: auth.user.name },
        timestamp: new Date().toISOString(),
        data: {
          previousStatus,
          newStatus: updateData.status,
          lead: updatedLead,
        },
      });
    }

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
