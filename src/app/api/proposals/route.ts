/**
 * Proposals API Route
 * Handles CRUD operations for proposals (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdminAuth, requirePermission } from '@/lib/admin-auth-middleware';
import { createProposalSchema, updateProposalSchema, validateBody } from '@/lib/validations/schemas';
import { notifyTeam, proposalCreatedEmail, notifyRecipient, proposalSentToClientEmail } from '@/lib/email/send';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { notifyClient } from '@/lib/notifications';
import { SITE_URL } from '@/lib/site-url';

// GET /api/proposals - Fetch all proposals
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.read');
  if ('error' in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    let query = supabase.from('proposals').select('*');

    const statusFilter = searchParams.get('status');
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const typeFilter = searchParams.get('proposalType');
    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('proposal_type', typeFilter);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Transform snake_case to camelCase
    const proposals = (data || []).map((row) => ({
      id: row.id,
      proposalNumber: row.proposal_number,
      title: row.title,
      client: {
        isExisting: row.client_is_existing,
        clientId: row.client_id,
        prospectInfo: row.prospect_info,
      },
      servicePackages: row.service_packages || [],
      customServices: row.custom_services || [],
      timeline: row.timeline || {},
      investment: row.investment || {},
      proposalType: row.proposal_type,
      validUntil: row.valid_until,
      status: row.status,
      executiveSummary: row.executive_summary,
      problemStatement: row.problem_statement,
      proposedSolution: row.proposed_solution,
      whyFreakingMinds: row.why_freaking_minds,
      nextSteps: row.next_steps,
      termsAndConditions: row.terms_and_conditions,
      template: row.template,
      brandColors: row.brand_colors,
      includeCaseStudies: row.include_case_studies,
      includeTestimonials: row.include_testimonials,
      createdBy: row.created_by,
      sentAt: row.sent_at,
      viewedAt: row.viewed_at,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      currency: row.currency || 'INR',
      discoveryId: row.discovery_id || null,
      version: row.version || 1,
    }));

    // Calculate stats
    const stats = {
      total: proposals.length,
      draft: 0, sent: 0, viewed: 0, approved: 0,
      declined: 0, expired: 0, converted: 0,
      approvalRate: 0, conversionRate: 0,
    };
    proposals.forEach((p) => {
      if (p.status in stats) (stats as any)[p.status]++;
    });
    const sentCount = stats.sent + stats.viewed + stats.approved + stats.declined + stats.expired + stats.converted;
    if (sentCount > 0) {
      stats.approvalRate = ((stats.approved + stats.converted) / sentCount) * 100;
      stats.conversionRate = (stats.converted / sentCount) * 100;
    }

    const response = NextResponse.json({
      success: true,
      data: proposals,
      stats,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

// POST /api/proposals - Create or update a proposal
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(createProposalSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = rawBody;
    const supabase = getSupabaseAdmin();

    // Generate proposal number via proposal_sequences table (same pattern as invoices)
    let proposalNumber = body.proposalNumber;
    if (!proposalNumber) {
      const now = new Date();
      const currentYear = now.getFullYear();

      const { data: seq, error: seqErr } = await supabase
        .from('proposal_sequences')
        .select('prefix, current_counter, current_year')
        .eq('id', 'default')
        .single();

      if (seqErr) throw seqErr;

      let newCounter: number;
      if (seq.current_year !== currentYear) {
        newCounter = 1;
      } else {
        newCounter = seq.current_counter + 1;
      }

      const { error: updateErr } = await supabase
        .from('proposal_sequences')
        .update({
          current_counter: newCounter,
          current_year: currentYear,
          updated_at: now.toISOString(),
        })
        .eq('id', 'default');

      if (updateErr) throw updateErr;
      proposalNumber = `${seq.prefix}${newCounter}/${currentYear}`;
    }

    const id = body.id || `prop-${Date.now()}`;

    const record = {
      id,
      proposal_number: proposalNumber,
      title: body.title || 'Untitled Proposal',
      client_is_existing: body.client?.isExisting ?? false,
      client_id: body.client?.clientId || null,
      prospect_info: body.client?.prospectInfo || null,
      service_packages: body.servicePackages || [],
      custom_services: body.customServices || [],
      timeline: body.timeline || {},
      investment: body.investment || {},
      proposal_type: body.proposalType || 'project',
      valid_until: body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: body.status || 'draft',
      executive_summary: body.executiveSummary || null,
      problem_statement: body.problemStatement || null,
      proposed_solution: body.proposedSolution || null,
      why_freaking_minds: body.whyFreakingMinds || null,
      next_steps: body.nextSteps || null,
      terms_and_conditions: body.termsAndConditions || null,
      template: body.template || 'professional',
      brand_colors: body.brandColors || null,
      include_case_studies: body.includeCaseStudies ?? false,
      include_testimonials: body.includeTestimonials ?? false,
      created_by: body.createdBy || 'admin',
      sent_at: body.sentAt || null,
      viewed_at: body.viewedAt || null,
      approved_at: body.approvedAt || null,
      currency: body.investment?.currency || 'INR',
      discovery_id: body.discoveryId || null,
      version: body.version || 1,
    };

    const { error } = await supabase.from('proposals').upsert(record);
    if (error) throw error;

    // Fire-and-forget: notify client if this is for an existing client
    if (body.client?.isExisting && body.client?.clientId) {
      notifyClient(body.client.clientId, {
        type: 'proposal_sent',
        title: 'New proposal received',
        message: record.title,
        actionUrl: `/client/${body.client.clientId}/proposals`,
      });
    }

    // Fire-and-forget email notification
    const prospectInfo = body.client?.prospectInfo as Record<string, string> | undefined;
    const emailData = proposalCreatedEmail({
      proposalNumber,
      title: record.title,
      clientName: prospectInfo?.name || prospectInfo?.company || undefined,
      status: record.status,
    });
    notifyTeam(emailData.subject, emailData.html);

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'proposal',
      resource_id: id,
      details: { proposalNumber, title: record.title },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: { ...body, id, proposalNumber },
      message: 'Proposal saved successfully',
    });
  } catch (error) {
    console.error('Error saving proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save proposal' },
      { status: 500 }
    );
  }
}

// PUT /api/proposals - Update proposal status
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(updateProposalSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const { id, status, ...rest } = rawBody;

    const supabase = getSupabaseAdmin();

    // Fetch current proposal for status transition validation and version increment
    const { data: current, error: fetchErr } = await supabase
      .from('proposals')
      .select('status, version')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      version: (current.version || 1) + 1,
    };

    if (status) {
      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        draft: ['sent'],
        sent: ['viewed', 'approved', 'declined', 'expired'],
        viewed: ['approved', 'declined', 'expired'],
        approved: ['converted'],
        declined: ['draft'],
        expired: ['draft'],
        converted: [],
        edit_requested: ['draft', 'sent'],
      };

      const allowed = validTransitions[current.status] || [];
      if (status !== current.status && !allowed.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from '${current.status}' to '${status}'` },
          { status: 400 }
        );
      }

      updates.status = status;
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'viewed') updates.viewed_at = new Date().toISOString();
      if (status === 'approved') updates.approved_at = new Date().toISOString();
    }

    // Map any additional camelCase fields to snake_case
    if (rest.title) updates.title = rest.title;
    if (rest.proposalType) updates.proposal_type = rest.proposalType;
    if (rest.currency) updates.currency = rest.currency;
    if (rest.discoveryId !== undefined) updates.discovery_id = rest.discoveryId || null;

    const { error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'proposal',
      resource_id: id,
      details: { updatedFields: Object.keys(updates), newStatus: status },
      ip_address: getClientIP(request),
    });

    // Notify client when proposal is marked as sent
    if (status === 'sent') {
      const { data: proposal } = await supabase
        .from('proposals')
        .select('title, proposal_number, client_is_existing, client_id')
        .eq('id', id)
        .single();

      if (proposal?.client_is_existing && proposal.client_id) {
        // In-app notification
        notifyClient(proposal.client_id, {
          type: 'proposal_sent',
          title: 'New proposal ready for review',
          message: proposal.title || 'Proposal',
          priority: 'high',
          actionUrl: `/client/${proposal.client_id}/proposals`,
        });

        // Email the client
        const { data: client } = await supabase
          .from('clients')
          .select('email, name')
          .eq('id', proposal.client_id)
          .single();

        if (client?.email) {
          const emailData = proposalSentToClientEmail({
            title: proposal.title || 'Proposal',
            proposalNumber: proposal.proposal_number || undefined,
            clientName: client.name || 'Client',
            portalUrl: `${SITE_URL}/client/${proposal.client_id}/proposals`,
          });
          notifyRecipient(client.email, emailData.subject, emailData.html);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Proposal updated successfully',
    });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update proposal' },
      { status: 500 }
    );
  }
}

// DELETE /api/proposals - Delete a proposal
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.delete');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('proposals').delete().eq('id', id);

    if (error) throw error;

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'proposal',
      resource_id: id,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete proposal' },
      { status: 500 }
    );
  }
}
