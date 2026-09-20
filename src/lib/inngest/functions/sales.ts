/**
 * Inngest Functions: Sales automation.
 *
 * Only primitive values pass between steps. Each step re-reads what it needs,
 * so a retried step never works from a stale or serialised copy of a lead.
 */

import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
import { notifyAdmins } from '@/lib/notifications';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordActivity } from '@/lib/sales/activity';
import { assignOwner } from '@/lib/sales/assignment';
import { generateLeadBrief } from '@/lib/sales/brief';
import { TEAM_SIGNATURE } from '@/lib/sales/emails';
import { WebhookRejection } from '@/lib/sales/errors';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { fetchMetaLead, mapMetaLead } from '@/lib/sales/intake/meta-graph';
import { loadLead, loadOwner } from '@/lib/sales/lead-store';
import { createPostMeetingTask, loadMeeting, sendMeetingBrief } from '@/lib/sales/meetings';
import { nextSendTime } from '@/lib/sales/send-window';
import { getSequence } from '@/lib/sales/sequence';
import {
  evaluateContinue,
  markSequenceActive,
  markSequenceCompleted,
  recordStepProgress,
  runSequenceStep,
} from '@/lib/sales/sequence-runner';
import { createTask, hasOpenTask } from '@/lib/sales/tasks';
import { enquiryFirstTouch, sendTemplateToLead } from '@/lib/whatsapp/send';

const FIRST_TOUCH_TITLE = 'First touch within the hour';
const UNIQUE_VIOLATION = '23505';

export const salesLeadCreatedFn = inngest.createFunction(
  { id: 'sales-lead-created', retries: 3 },
  { event: 'sales/lead.created' },
  async ({ event, step }) => {
    const { leadId } = event.data;

    await step.run('assign-owner', async () => {
      const owner = await assignOwner(leadId);
      return owner ? owner.id : null;
    });

    // Step results are kept in Inngest's run history, which must not hold lead
    // content. The draft is written and used inside this one step, so only a
    // flag leaves it.
    const brief = await step.run('write-brief', async () => {
      const lead = await loadLead(leadId);
      if (!lead) return { written: false };
      const owner = await loadOwner(lead.owner_id);
      const generated = await generateLeadBrief(lead, owner?.name ?? TEAM_SIGNATURE);
      if (!(await hasOpenTask(leadId, FIRST_TOUCH_TITLE))) {
        await createTask({
          leadId,
          ownerId: lead.owner_id,
          type: lead.phone_e164 ? 'whatsapp' : 'call',
          title: FIRST_TOUCH_TITLE,
          draftBody: generated.draft,
          dueAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        });
      }
      await recordActivity({ leadId, type: 'ai_brief', body: generated.brief, metadata: { aiGenerated: generated.aiGenerated } });
      return { written: true };
    });
    if (!brief.written) return { skipped: 'lead_missing' };

    /*
     * The one message that goes out without a person deciding to.
     *
     * Everything else in this system is person-started — no automatic
     * enrolment, nothing emailed until someone clicks Start on the lead page.
     * This is the deliberate exception: a reply to an enquiry is worth far
     * more in the first minutes than in the first hours, and the template is
     * an acknowledgement rather than a pitch.
     *
     * It is still refusable. `sendTemplateToLead` checks consent, the
     * do-not-contact list, the automation switch and configuration, so this
     * cannot outrun any of them; `respondingToAction` waives only the
     * sending-hours rule, because someone who filled a form at 02:00 is awake.
     *
     * Its own step, so a Meta outage retries the send without writing the AI
     * brief or the task a second time.
     */
    const firstTouch = await step.run('whatsapp-first-touch', async () => {
      const lead = await loadLead(leadId);
      if (!lead || !lead.phone_e164) return { sent: false, reason: 'no_phone' };
      const owner = await loadOwner(lead.owner_id);
      const outcome = await sendTemplateToLead({
        lead,
        template: enquiryFirstTouch(lead, owner?.name ?? TEAM_SIGNATURE),
        category: 'marketing',
        respondingToAction: true,
      });
      // Only the reason leaves the step: Inngest keeps step results in its run
      // history, which must not hold a customer's name or message.
      return outcome.sent ? { sent: true } : { sent: false, reason: outcome.reason };
    });

    // No automatic enrolment beyond that: nothing further is sent until a
    // person starts a sequence from the lead page.
    return { written: true, whatsapp: firstTouch };
  }
);

export const salesSequenceFn = inngest.createFunction(
  {
    id: 'sales-sequence',
    retries: 3,
    cancelOn: [{ event: 'sales/sequence.stop', match: 'data.leadId' }],
  },
  { event: 'sales/sequence.start' },
  async ({ event, step }) => {
    const { leadId, sequenceKey } = event.data;

    // An unknown key can never become valid on retry, so this stops without
    // throwing rather than failing the run.
    const steps = getSequence(sequenceKey);
    if (!steps) return { skipped: 'unknown_sequence' };

    const enrolled = await step.run('enrol', () => markSequenceActive(leadId, sequenceKey));
    if (!enrolled) return { skipped: 'already_enrolled' };

    for (const [index, sequenceStep] of steps.entries()) {
      if (sequenceStep.waitBefore !== '0s') {
        await step.sleep(`wait-${index}`, sequenceStep.waitBefore);
      }

      if (sequenceStep.kind === 'email') {
        const sendAt = await step.run(`send-window-${index}`, () => nextSendTime(new Date()).toISOString());
        await step.sleepUntil(`open-window-${index}`, sendAt);
      }

      const decision = await step.run(`check-${index}`, () => evaluateContinue(leadId));
      if (!decision.ok) return { stopped: decision.reason, atStep: index };

      const result = await step.run(`step-${index}`, () => runSequenceStep(leadId, sequenceStep));
      if (!result.done) return { stopped: result.stopped, atStep: index };

      await step.run(`progress-${index}`, () => recordStepProgress(leadId, sequenceStep, index));
    }

    await step.run('complete', () => markSequenceCompleted(leadId));
    return { completed: true };
  }
);

/**
 * A Meta lead that could not be fetched exists only in Meta, so its failure must
 * be seen: an admin notification, and a `webhook_logs` row that Settings → Sales
 * shows as the Meta source's last error. Carries ids and the error, never lead data.
 */
export async function reportMetaLeadgenFailure(failure: { leadgenId: string; pageId: string; message: string }): Promise<void> {
  await notifyAdmins({
    type: 'general',
    title: 'A Meta lead could not be fetched',
    message: failure.message,
    priority: 'high',
    actionUrl: '/admin/settings',
  });

  const { error } = await getSupabaseAdmin()
    .from('webhook_logs')
    .insert({
      provider: 'sales:meta',
      event_type: 'leadgen_fetch_failed',
      payload: { leadgenId: failure.leadgenId, pageId: failure.pageId },
      headers: {},
      signature_valid: true,
      processed: false,
      error: failure.message,
      external_id: `leadgen-fetch-failed:${failure.leadgenId}`,
    });
  // The same lead failing again is already on record. Any other insert error must not
  // throw: this runs inside Inngest's onFailure handler, and a throw there retries the
  // handler itself — repeating the admin notification above.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error('[sales] meta failure log insert failed:', error.message);
  }
}

export const salesMetaLeadgenFn = inngest.createFunction(
  {
    id: 'sales-meta-leadgen',
    retries: 5,
    // Runs once every retry is spent, or at once for a NonRetriableError.
    onFailure: async ({ event, error }) => {
      const { leadgenId, pageId } = event.data.event.data;
      await reportMetaLeadgenFailure({ leadgenId, pageId, message: error.message });
    },
  },
  { event: 'sales/meta.leadgen' },
  async ({ event, step }) => {
    const { leadgenId, pageId } = event.data;
    return step.run('fetch-and-ingest', async () => {
      try {
        const lead = await fetchMetaLead(leadgenId, pageId);
        return await ingestLead(mapMetaLead(lead, pageId));
      } catch (err) {
        // A missing Page connection or an unusable lead will not fix itself on retry.
        if (err instanceof WebhookRejection) throw new NonRetriableError(err.message);
        throw err;
      }
    });
  }
);

export const salesMeetingPrepFn = inngest.createFunction(
  {
    id: 'sales-meeting-prep',
    retries: 3,
    cancelOn: [{ event: 'sales/meeting.cancelled', match: 'data.meetingId' }],
  },
  { event: 'sales/meeting.booked' },
  async ({ event, step }) => {
    const { meetingId } = event.data;

    const times = await step.run('load-times', async () => {
      const meeting = await loadMeeting(meetingId);
      return meeting && meeting.status === 'booked' ? { startsAt: meeting.starts_at, endsAt: meeting.ends_at } : null;
    });
    if (!times) return { skipped: 'not_booked' };

    const prepAt = new Date(new Date(times.startsAt).getTime() - 2 * 60 * 60_000).toISOString();
    await step.sleepUntil('until-prep', prepAt);
    await step.run('send-brief', () => sendMeetingBrief(meetingId));

    const afterCall = new Date(new Date(times.endsAt).getTime() + 30 * 60_000).toISOString();
    await step.sleepUntil('until-after-call', afterCall);
    await step.run('post-call-task', () => createPostMeetingTask(meetingId));

    return { done: true };
  }
);
