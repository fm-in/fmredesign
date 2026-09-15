import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { canAccessLead } from '@/lib/sales/access';
import { loadLead } from '@/lib/sales/lead-store';
import { firstIssue, taskPatchSchema } from '@/lib/sales/schemas';
import { completeTask } from '@/lib/sales/tasks';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = taskPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));

  const { data: task } = await getSupabaseAdmin().from('sales_tasks').select('id, lead_id, owner_id').eq('id', id).maybeSingle();
  if (!task) return ApiResponse.notFound('Task not found');

  const lead = await loadLead(task.lead_id);
  const allowed = task.owner_id === auth.user.id || (lead !== null && canAccessLead(auth.user, lead));
  if (!allowed) return ApiResponse.notFound('Task not found');

  const updated = await completeTask(id, parsed.data.status, { id: auth.user.id, name: auth.user.name });
  if (!updated) return ApiResponse.validationError('This task is already closed');
  return ApiResponse.success(toCamelCaseKeys(updated));
}
