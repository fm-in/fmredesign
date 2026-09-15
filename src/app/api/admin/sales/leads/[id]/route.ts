/** Lead detail for the sales team: the lead, its timeline, tasks, calls and owners. */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { createNotification } from '@/lib/notifications';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { canAccessLead, canAssignOwner, isSalesAdmin } from '@/lib/sales/access';
import { changeStage, recordActivity } from '@/lib/sales/activity';
import { loadLead, loadOwner } from '@/lib/sales/lead-store';
import { firstIssue, leadPatchSchema } from '@/lib/sales/schemas';
import { isSuppressed } from '@/lib/sales/suppression';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  try {
    const lead = await loadLead(id);
    if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

    const supabase = getSupabaseAdmin();
    const [activities, tasks, meetings, owners, suppressed] = await Promise.all([
      supabase.from('lead_activities').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }).limit(200),
      supabase.from('sales_tasks').select('*').eq('lead_id', id).order('due_at', { ascending: true }),
      supabase.from('meetings').select('*').eq('lead_id', id).order('starts_at', { ascending: false }),
      supabase.from('authorized_users').select('id, name').eq('status', 'active').order('name', { ascending: true }),
      isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 }),
    ]);

    return ApiResponse.success({
      lead: toCamelCaseKeys(lead),
      activities: (activities.data ?? []).map((row: Record<string, unknown>) => toCamelCaseKeys(row)),
      tasks: (tasks.data ?? []).map((row: Record<string, unknown>) => toCamelCaseKeys(row)),
      meetings: (meetings.data ?? []).map((row: Record<string, unknown>) => toCamelCaseKeys(row)),
      owners: (owners.data ?? []).map((row: { id: string; name: string }) => ({ id: row.id, name: row.name })),
      suppressed,
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

      const { error } = await supabase.from('leads').update({ owner_id: body.ownerId, assigned_to: owner?.name ?? null }).eq('id', id);
      if (error) throw error;

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
    return ApiResponse.success({ lead: updated ? toCamelCaseKeys(updated) : null });
  } catch (error) {
    console.error('[sales] lead update failed:', error);
    return ApiResponse.error('Could not update the lead');
  }
}
