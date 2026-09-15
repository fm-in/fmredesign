/**
 * Inngest Functions: Sales automation.
 *
 * Only primitive values pass between steps. Each step re-reads what it needs,
 * so a retried step never works from a stale or serialised copy of a lead.
 */

import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
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
import { INBOUND_V1, INBOUND_V1_KEY } from '@/lib/sales/sequence';
import {
  evaluateContinue,
  markSequenceActive,
  markSequenceCompleted,
  recordStepProgress,
  runSequenceStep,
} from '@/lib/sales/sequence-runner';
import { createTask, hasOpenTask } from '@/lib/sales/tasks';

const FIRST_TOUCH_TITLE = 'First touch within the hour';

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
      await recordActivity({ leadId, type: 'ai_brief', body: generated.brief, metadata: { aiGenerated: generated.aiGenerated } });
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
      return { written: true };
    });
    if (!brief.written) return { skipped: 'lead_missing' };

    const startSequence = await step.run('check-sequence', async () => {
      const lead = await loadLead(leadId);
      if (!lead) return false;
      // Bookings already have a confirmation from Cal.com; they get no sequence.
      return Boolean(lead.email) && lead.source !== 'cal_booking';
    });

    if (startSequence) {
      await step.sendEvent('start-sequence', { name: 'sales/sequence.start', data: { leadId } });
    }
    return { sequence: startSequence };
  }
);

export const salesSequenceInboundFn = inngest.createFunction(
  {
    id: 'sales-sequence-inbound-v1',
    retries: 3,
    cancelOn: [{ event: 'sales/sequence.stop', match: 'data.leadId' }],
  },
  { event: 'sales/sequence.start' },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const enrolled = await step.run('enrol', () => markSequenceActive(leadId, INBOUND_V1_KEY));
    if (!enrolled) return { skipped: 'already_enrolled' };

    for (const [index, sequenceStep] of INBOUND_V1.entries()) {
      if (sequenceStep.waitBefore !== '0s') {
        await step.sleep(`wait-${index}`, sequenceStep.waitBefore);
      }

      if (sequenceStep.kind === 'email') {
        const sendAt = await step.run(`send-window-${index}`, () => nextSendTime(new Date()).toISOString());
        await step.sleepUntil(`open-window-${index}`, sendAt);
      }

      const decision = await step.run(`check-${index}`, () => evaluateContinue(leadId));
      if (!decision.ok) return { stopped: decision.reason, atStep: index };

      const result = await step.run(`step-${index}`, () => runSequenceStep(leadId, sequenceStep, index));
      if (!result.done) return { stopped: result.stopped, atStep: index };

      await step.run(`progress-${index}`, () => recordStepProgress(leadId, sequenceStep, index));
    }

    await step.run('complete', () => markSequenceCompleted(leadId));
    return { completed: true };
  }
);

export const salesMetaLeadgenFn = inngest.createFunction(
  { id: 'sales-meta-leadgen', retries: 5 },
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
