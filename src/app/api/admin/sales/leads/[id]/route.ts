/** Lead detail for the sales team: the lead, its timeline, tasks, calls and owners. */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getClientIP, logAuditEvent } from '@/lib/admin/audit-log';
import { createNotification } from '@/lib/notifications';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { canAccessLead, canAssignOwner, isSalesAdmin } from '@/lib/sales/access';
import { changeStage, recordActivity } from '@/lib/sales/activity';
import { loadLead, loadOwner } from '@/lib/sales/lead-store';
import { recommendSequence, sequenceStartState } from '@/lib/sales/sequence';
import { getSalesSettings } from '@/lib/sales/settings';
import type { LeadRow } from '@/lib/sales/types';
import { firstIssue, leadPatchSchema } from '@/lib/sales/schemas';
import { isSuppressed } from '@/lib/sales/suppression';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * camelCase for the API, except form answers and activity metadata: their keys are
 * labels a person wrote (or a form sent), and a deep camelCase would rename them.
 */
function leadPayload(lead: LeadRow) {
  return { ...toCamelCaseKeys(lead), customFields: lead.custom_fields };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  try {
    const lead = await loadLead(id);
    if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

    const supabase = getSupabaseAdmin();
    const [activities, tasks, meetings, owners, suppressed, settings] = await Promise.all([
      supabase.from('lead_activities').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }).limit(200),
      supabase.from('sales_tasks').select('*').eq('lead_id', id).order('due_at', { ascending: true }),
      supabase.from('meetings').select('*').eq('lead_id', id).order('starts_at', { ascending: false }),
      supabase.from('authorized_users').select('id, name').eq('status', 'active').order('name', { ascending: true }),
      isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 }),
      getSalesSettings(),
    ]);

    // Reuses the same refusal logic the start route enforces, so the panel
    // never offers a set the endpoint would then refuse.
    const sequences = {
      recommended: recommendSequence(lead),
      ...sequenceStartState(lead, { suppressed, automationEnabled: settings.automationEnabled }),
    };

    return ApiResponse.success({
      lead: leadPayload(lead),
      activities: (activities.data ?? []).map((row: Record<string, unknown>) => ({ ...toCamelCaseKeys(row), metadata: row.metadata ?? {} })),
      tasks: (tasks.data ?? []).map((row: Record<string, unknown>) => toCamelCaseKeys(row)),
      meetings: (meetings.data ?? []).map((row: Record<string, unknown>) => toCamelCaseKeys(row)),
      owners: (owners.data ?? []).map((row: { id: string; name: string }) => ({ id: row.id, name: row.name })),
      suppressed,
      sequences,
      permissions: { canAssign: isSalesAdmin(auth.user), userId: auth.user.id },
    });
  } catch (error) {
    console.error('[sales] lead detail failed:', error);
    return ApiResponse.error('Could not load this lead');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = leadPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));
  const body = parsed.data;

  try {
    const lead = await loadLead(id);
    if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

    const supabase = getSupabaseAdmin();
    const actor = { id: auth.user.id, name: auth.user.name };

    if (body.ownerId !== undefined && body.ownerId !== lead.owner_id) {
      if (!canAssignOwner(auth.user, lead.owner_id, body.ownerId)) {
        return ApiResponse.error('You can take unassigned leads or release your own', 403);
      }
      const owner = body.ownerId ? await loadOwner(body.ownerId) : null;
      if (body.ownerId && !owner) return ApiResponse.validationError('That team member does not exist');

      // Compare-and-swap: only apply the update if the owner is still what we read it as,
      // so two people racing to claim the same lead cannot silently overwrite each other.
      const ownerUpdateQuery = supabase.from('leads').update({ owner_id: body.ownerId, assigned_to: owner?.name ?? null }).eq('id', id);
      const { data: ownerUpdateRows, error } = await (
        lead.owner_id === null ? ownerUpdateQuery.is('owner_id', null) : ownerUpdateQuery.eq('owner_id', lead.owner_id)
      ).select('id');
      if (error) throw error;
      if (!ownerUpdateRows || ownerUpdateRows.length === 0) {
        return ApiResponse.error('This lead was just reassigned. Reload and try again.', 409);
      }

      await recordActivity({
        leadId: id,
        type: 'owner_changed',
        actor,
        metadata: { from: lead.owner_id, to: body.ownerId, toName: owner?.name ?? null },
      });
      if (owner && owner.id !== auth.user.id) {
        await createNotification({
          recipientType: 'admin',
          recipientId: owner.id,
          type: 'general',
          title: 'A lead was assigned to you',
          message: lead.name,
          priority: 'high',
          actionUrl: `/admin/leads/${id}`,
        });
      }
      await logAuditEvent({
        user_id: auth.user.id,
        user_name: auth.user.name,
        action: 'update',
        resource_type: 'lead',
        resource_id: id,
        details: { field: 'owner', from: lead.owner_id, to: body.ownerId },
        ip_address: getClientIP(request),
      });
    }

    if (body.dealValue !== undefined || body.currency !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.dealValue !== undefined) updates.deal_value = body.dealValue;
      if (body.currency !== undefined) updates.currency = body.currency;
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) throw error;
    }

    if (body.status) {
      await changeStage(id, body.status, actor, { lostReason: body.lostReason });
    }

    const updated = await loadLead(id);
    return ApiResponse.success({ lead: updated ? leadPayload(updated) : null });
  } catch (error) {
    console.error('[sales] lead update failed:', error);
    return ApiResponse.error('Could not update the lead');
  }
}
