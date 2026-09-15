'use client';

import { useState } from 'react';
import { DashboardButton } from '@/design-system';
import { formatIst, STAGE_LABELS, type SalesActivity } from '@/lib/sales/api-types';
import { isLeadStatus, type ActivityType } from '@/lib/sales/types';

const TITLES: Record<ActivityType, string> = {
  note: 'Note',
  form_submitted: 'Enquiry received',
  email_sent: 'Email sent',
  email_failed: 'Email failed',
  email_received: 'Reply received',
  email_bounced: 'Email bounced',
  task_created: 'Task created',
  task_completed: 'Task closed',
  meeting_booked: 'Call booked',
  meeting_rescheduled: 'Call rescheduled',
  meeting_cancelled: 'Call cancelled',
  meeting_completed: 'Call held',
  stage_changed: 'Stage changed',
  owner_changed: 'Owner changed',
  sequence_stopped: 'Follow-ups stopped',
  ai_brief: 'AI brief',
  unsubscribed: 'Unsubscribed',
};

const PREVIEW_LENGTH = 600;

function describe(activity: SalesActivity): string | null {
  const meta = activity.metadata;
  if (activity.type === 'stage_changed' && isLeadStatus(meta.from) && isLeadStatus(meta.to)) {
    return `${STAGE_LABELS[meta.from]} → ${STAGE_LABELS[meta.to]}${typeof meta.lostReason === 'string' ? ` · ${meta.lostReason}` : ''}`;
  }
  if (activity.type === 'owner_changed') return typeof meta.toName === 'string' ? `Now owned by ${meta.toName}` : 'Unassigned';
  if (activity.type === 'sequence_stopped' && typeof meta.reason === 'string') return `Reason: ${meta.reason.replace(/_/g, ' ')}`;
  return activity.subject;
}

function Entry({ activity }: { activity: SalesActivity }) {
  const [expanded, setExpanded] = useState(false);
  const detail = describe(activity);
  const body = activity.body ?? '';
  const long = body.length > PREVIEW_LENGTH;

  return (
    <li className="relative border-l-2 border-fm-neutral-200 pb-5 pl-4 last:pb-0">
      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-fm-magenta-600" aria-hidden="true" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-fm-neutral-900">{TITLES[activity.type]}</p>
        <p className="text-xs text-fm-neutral-500">
          {activity.actorName ? `${activity.actorName} · ` : ''}
          {formatIst(activity.occurredAt)}
        </p>
      </div>
      {detail && <p className="text-sm text-fm-neutral-700">{detail}</p>}
      {body && (
        <p className="mt-1 whitespace-pre-line text-sm text-fm-neutral-600">
          {long && !expanded ? `${body.slice(0, PREVIEW_LENGTH)}…` : body}
        </p>
      )}
      {long && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-medium text-fm-magenta-700 hover:underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </li>
  );
}

export function LeadTimeline({ activities, onAddNote }: { activities: SalesActivity[]; onAddNote: (body: string) => Promise<boolean> }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const saved = await onAddNote(note.trim());
      // Only clear what the person typed once the note actually saved — a failed
      // save (network error, validation, etc.) must leave their draft in place.
      if (saved) setNote('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="lead-note" className="block text-sm font-medium text-fm-neutral-800">
          Add a note
        </label>
        <textarea
          id="lead-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What happened on the call, what they asked for, what to do next"
          className="w-full rounded-md border border-fm-neutral-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
        />
        <DashboardButton variant="primary" size="sm" onClick={submit} disabled={saving || !note.trim()}>
          {saving ? 'Saving…' : 'Add note'}
        </DashboardButton>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-fm-neutral-500">Nothing has happened on this lead yet.</p>
      ) : (
        <ol className="space-y-0">
          {activities.map((activity) => (
            <Entry key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
    </div>
  );
}
