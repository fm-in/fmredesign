import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { recordActivity } from '@/lib/sales/activity';
import { loadLead } from '@/lib/sales/lead-store';
import { firstIssue, noteSchema } from '@/lib/sales/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));

  const lead = await loadLead(id);
  if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

  const activityId = await recordActivity({
    leadId: id,
    type: 'note',
    body: parsed.data.body,
    actor: { id: auth.user.id, name: auth.user.name },
  });
  if (!activityId) return ApiResponse.error('Could not save the note');
  return ApiResponse.success({ id: activityId });
}
