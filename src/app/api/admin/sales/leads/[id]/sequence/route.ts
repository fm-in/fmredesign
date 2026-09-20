import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { loadLatestSequenceStartAt, loadLead } from '@/lib/sales/lead-store';
import { sequenceStartAttempt, sequenceStartState } from '@/lib/sales/sequence';
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

  // A start recorded in the last few minutes that has not enrolled yet is still
  // in flight: refuse a second one (a double click, two tabs). Once the window
  // passes without enrolment the start counts as failed and may be retried.
  // This is time-bounded on purpose — an event-id dedupe would silently drop
  // every retry of a run that never happened. If a race does get two events
  // through, markSequenceActive only enrols a lead whose sequence_status is null.
  let lastStartedAt: string | null;
  try {
    lastStartedAt = await loadLatestSequenceStartAt(id);
  } catch (err) {
    console.error(`[sales] could not check for an in-flight start for ${id}:`, err);
    return ApiResponse.error("Couldn't start follow-ups right now. Try again in a minute.", 503);
  }
  if (sequenceStartAttempt(lead, lastStartedAt).inFlight) {
    return ApiResponse.error('Follow-ups are already starting for this lead. Give it a minute, then refresh.', 409);
  }

  // Send directly, not through the shared sales event helper, which swallows
  // failures: the person clicking Start must be told when nothing was queued.
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({ name: 'sales/sequence.start', data: { leadId: id, sequenceKey } });
  } catch (err) {
    console.error(`[sales] failed to queue sales/sequence.start for ${id}:`, err);
    return ApiResponse.error("Couldn't start follow-ups right now. Try again in a minute.", 503);
  }

  // Recorded only once the start is queued, so the timeline never claims a start that did not happen.
  await recordActivity({ leadId: id, type: 'sequence_started', actor, metadata: { sequenceKey } });

  return ApiResponse.success({ started: true, sequenceKey });
}
