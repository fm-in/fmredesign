/**
 * Lead to Client Conversion API
 * Converts a qualified lead into a client record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ProjectUtils } from '@/lib/admin/project-types';

// Lead → Project default duration. 60 days is a reasonable rough estimate
// for an initial engagement; the user adjusts in the project edit screen.
const DEFAULT_PROJECT_DURATION_DAYS = 60;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  let slug = base;
  let counter = 1;

  while (true) {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    if (!data || data.length === 0) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    // Optional `createProject: true` seeds a first project from the lead's
    // service_type and estimated value, so the user lands on a client that
    // already has a project to plan against — instead of an empty shell.
    const { leadId, createProject = false } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    if (lead.status === 'won' && lead.client_id) {
      return NextResponse.json(
        { success: false, error: 'Lead has already been converted to a client' },
        { status: 400 }
      );
    }

    // Create client from lead data
    const clientId = `client-${Date.now()}`;
    const clientName = lead.company || lead.name;

    const { error: clientError } = await supabase.from('clients').insert({
      id: clientId,
      name: clientName,
      email: lead.email,
      phone: lead.phone || null,
      industry: lead.industry || 'other',
      website: lead.website || null,
      company_size: lead.company_size || 'medium',
      status: 'active',
      health: 'good',
      account_manager: lead.assigned_to || 'admin',
      contract_type: 'project',
      contract_value: 0,
      contract_start_date: new Date().toISOString(),
      billing_cycle: 'monthly',
      total_value: 0,
      slug: await uniqueSlug(slugify(clientName)),
      services: lead.project_type ? [lead.project_type] : [],
      tags: lead.tags || [],
    });

    if (clientError) throw clientError;

    // Update lead status to 'won' and link to client
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'won',
        converted_to_client_at: new Date().toISOString(),
        client_id: clientId,
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Optionally seed a first project. Non-fatal: a project-insert failure
    // does not roll back the client; we still return success with a warning.
    let projectId: string | null = null;
    let projectWarning: string | null = null;
    if (createProject) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + DEFAULT_PROJECT_DURATION_DAYS);
      const projectType = (lead.project_type as string) || 'consultation';
      const projectBudget = Number(lead.estimated_value ?? lead.budget ?? 0) || 0;
      const projectName = `${clientName} — ${projectType.replace(/[-_]/g, ' ')} engagement`;

      const newProject = {
        id: ProjectUtils.generateProjectId(),
        client_id: clientId,
        discovery_id: null,
        name: projectName,
        description: lead.notes || lead.message || '',
        type: projectType,
        status: 'planning',
        priority: lead.priority || 'medium',
        start_date: now.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        estimated_hours: 0,
        project_manager: lead.assigned_to || auth.user.id,
        budget: projectBudget,
        hourly_rate: 0,
        progress: 0,
        milestones: [],
        deliverables: [],
        content_requirements: { postsPerWeek: 0, platforms: [], contentTypes: [] },
        assigned_talent: [],
        tags: lead.tags || [],
        notes: `Seeded from lead conversion (lead ${leadId}).`,
      };

      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .insert(newProject)
        .select('id')
        .single();

      if (projectError) {
        // Don't fail the whole conversion if project seeding has issues;
        // the client and lead are already in their new state.
        console.error('Lead→Project seeding failed:', projectError);
        projectWarning = 'Client created, but first project could not be seeded.';
      } else if (projectRow) {
        projectId = projectRow.id as string;
      }
    }

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'client',
      resource_id: clientId,
      details: { convertedFromLead: leadId, clientName, seededProjectId: projectId },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: { leadId, clientId, projectId },
      message: projectWarning
        ? projectWarning
        : projectId
          ? 'Lead converted to client and first project seeded'
          : 'Lead successfully converted to client',
    });
  } catch (error) {
    console.error('Error converting lead to client:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert lead to client' },
      { status: 500 }
    );
  }
}
