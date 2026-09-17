import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { loadLead } from '@/lib/sales/lead-store';
import { sequenceStartState } from '@/lib/sales/sequence';
import { getSalesSettings } from '@/lib/sales/settings';
import { isSuppressed } from '@/lib/sales/suppression';
import { firstIssue, sequenceActionSchema } from '@/lib/sales/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = sequenceActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));

  const lead = await loadLead(id);
  if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

  const actor = { id: auth.user.id, name: auth.user.name };

  if (parsed.data.action === 'stop') {
    const stopped = await stopSequence(id, 'manual', actor);
    return ApiResponse.success({ stopped });
  }

  const { sequenceKey } = parsed.data;

  // Refusals are written for the salesperson reading the panel, not a developer
  // reading a log — each names the specific reason nothing can be sent. The
  // checks themselves live in sequenceStartState, shared with the lead detail
  // payload so the panel can never offer a button this route then refuses.
  const [suppressed, settings] = await Promise.all([
    isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 }),
    getSalesSettings(),
  ]);
  const state = sequenceStartState(lead, { suppressed, automationEnabled: settings.automationEnabled });
  if (!state.canStart) {
    return ApiResponse.validationError(state.blockedReason);
  }

  // Send directly, not through the shared sales event helper, which swallows
  // failures: the person clicking Start must be told when nothing was queued.
  // The id is fixed per lead, so Inngest drops a second start (a double click,
  // two tabs) — only one sequence ever runs per lead anyway.
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({ id: `sales-sequence-start-${id}`, name: 'sales/sequence.start', data: { leadId: id, sequenceKey } });
  } catch (err) {
    console.error(`[sales] failed to queue sales/sequence.start for ${id}:`, err);
    return ApiResponse.error("Couldn't start follow-ups right now. Try again in a minute.", 503);
  }

  // Recorded only once the start is queued, so the timeline never claims a start that did not happen.
  await recordActivity({ leadId: id, type: 'sequence_started', actor, metadata: { sequenceKey } });

  return ApiResponse.success({ started: true, sequenceKey });
}
