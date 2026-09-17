import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { loadLead } from '@/lib/sales/lead-store';
import { completeMeeting, loadMeeting, markNoShow } from '@/lib/sales/meetings';
import { firstIssue, meetingPatchSchema } from '@/lib/sales/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = meetingPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));

  const meeting = await loadMeeting(id);
  const lead = meeting ? await loadLead(meeting.lead_id) : null;
  if (!meeting || !lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Call not found');

  const actor = { id: auth.user.id, name: auth.user.name };
  if (parsed.data.status === 'completed') await completeMeeting(id, actor);
  else await markNoShow(id, actor);
  return ApiResponse.success({ status: parsed.data.status });
}
