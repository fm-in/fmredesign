/**
 * Discovery API Endpoints
 * Handles CRUD operations for discovery sessions (Supabase JSONB)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { createDiscoverySchema, updateDiscoverySchema, validateBody } from '@/lib/validations/schemas';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.read');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const clientId = searchParams.get('clientId');

    const supabase = getSupabaseAdmin();

    if (sessionId) {
      const { data, error } = await supabase
        .from('discovery_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: 'Discovery session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transformSession(data),
      });
    }

    let query = supabase.from('discovery_sessions').select('*').order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: (data || []).map(transformSession),
    });
  } catch (error) {
    console.error('Error fetching discovery sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discovery sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(createDiscoverySchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = rawBody;
    const { session } = body;

    const record = {
      id: session.id,
      client_id: session.clientId,
      lead_id: session.leadId || null,
      status: session.status || 'in_progress',
      current_section: session.currentSection || 1,
      completed_sections: session.completedSections || [],
      assigned_to: session.assignedTo || null,
      completed_at: session.completedAt || null,
      company_fundamentals: session.companyFundamentals || {},
      project_overview: session.projectOverview || {},
      target_audience: session.targetAudience || {},
      current_state: session.currentState || {},
      goals_kpis: session.goalsKPIs || {},
      competition_market: session.competitionMarket || {},
      budget_resources: session.budgetResources || {},
      technical_requirements: session.technicalRequirements || {},
      content_creative: session.contentCreative || {},
      next_steps: session.nextSteps || {},
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('discovery_sessions').insert(record);

    if (error) throw error;

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'discovery_session',
      resource_id: session.id,
      details: { clientId: session.clientId },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating discovery session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discovery session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(updateDiscoverySchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = rawBody;
    const { sessionId, updates } = body;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.currentSection !== undefined) dbUpdates.current_section = updates.currentSection;
    if (updates.completedSections !== undefined) dbUpdates.completed_sections = updates.completedSections;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.companyFundamentals !== undefined) dbUpdates.company_fundamentals = updates.companyFundamentals;
    if (updates.projectOverview !== undefined) dbUpdates.project_overview = updates.projectOverview;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.currentState !== undefined) dbUpdates.current_state = updates.currentState;
    if (updates.goalsKPIs !== undefined) dbUpdates.goals_kpis = updates.goalsKPIs;
    if (updates.competitionMarket !== undefined) dbUpdates.competition_market = updates.competitionMarket;
    if (updates.budgetResources !== undefined) dbUpdates.budget_resources = updates.budgetResources;
    if (updates.technicalRequirements !== undefined) dbUpdates.technical_requirements = updates.technicalRequirements;
    if (updates.contentCreative !== undefined) dbUpdates.content_creative = updates.contentCreative;
    if (updates.nextSteps !== undefined) dbUpdates.next_steps = updates.nextSteps;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('discovery_sessions')
      .update(dbUpdates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Discovery session not found' },
        { status: 404 }
      );
    }

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'discovery_session',
      resource_id: sessionId,
      details: { updatedFields: Object.keys(dbUpdates) },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: transformSession(data),
    });
  } catch (error) {
    console.error('Error updating discovery session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update discovery session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.delete');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('discovery_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'discovery_session',
      resource_id: sessionId,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Discovery session deleted',
    });
  } catch (error) {
    console.error('Error deleting discovery session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete discovery session' },
      { status: 500 }
    );
  }
}

/** Transform Supabase row to API response shape */
function transformSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    clientId: row.client_id,
    leadId: row.lead_id,
    status: row.status,
    currentSection: row.current_section,
    completedSections: row.completed_sections || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    assignedTo: row.assigned_to,
    companyFundamentals: row.company_fundamentals || {},
    projectOverview: row.project_overview || {},
    targetAudience: row.target_audience || {},
    currentState: row.current_state || {},
    goalsKPIs: row.goals_kpis || {},
    competitionMarket: row.competition_market || {},
    budgetResources: row.budget_resources || {},
    technicalRequirements: row.technical_requirements || {},
    contentCreative: row.content_creative || {},
    nextSteps: row.next_steps || {},
  };
}
