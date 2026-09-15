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

    const draft = await step.run('write-brief', async () => {
      const lead = await loadLead(leadId);
      if (!lead) return null;
      const owner = await loadOwner(lead.owner_id);
      const brief = await generateLeadBrief(lead, owner?.name ?? TEAM_SIGNATURE);
      await recordActivity({ leadId, type: 'ai_brief', body: brief.brief, metadata: { aiGenerated: brief.aiGenerated } });
      return brief.draft;
    });
    if (draft === null) return { skipped: 'lead_missing' };

    const startSequence = await step.run('first-touch-task', async () => {
      const lead = await loadLead(leadId);
      if (!lead) return false;
      if (!(await hasOpenTask(leadId, FIRST_TOUCH_TITLE))) {
        await createTask({
          leadId,
          ownerId: lead.owner_id,
          type: lead.phone_e164 ? 'whatsapp' : 'call',
          title: FIRST_TOUCH_TITLE,
          draftBody: draft,
          dueAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        });
      }
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
