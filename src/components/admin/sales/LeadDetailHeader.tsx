'use client';

import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { CardContent, DashboardButton, DashboardCard } from '@/design-system';
import { Select } from '@/components/ui/select-native';
import { StatusBadge } from '@/components/ui/status-badge';
import type { LeadStatus } from '@/lib/admin/lead-types';
import { SEQUENCE_LABELS, STAGE_LABELS, type OwnerOption, type SalesLead, type SequenceStartInfo } from '@/lib/sales/api-types';
import { isLeadStatus, LEAD_STATUSES } from '@/lib/sales/types';

interface LeadDetailHeaderProps {
  lead: SalesLead;
  owners: OwnerOption[];
  canAssign: boolean;
  userId: string;
  suppressed: boolean;
  sequences: SequenceStartInfo;
  onStageChange: (status: LeadStatus, lostReason?: string) => Promise<boolean>;
  onOwnerChange: (ownerId: string | null) => Promise<boolean>;
  onStopSequence: () => Promise<boolean>;
  onStartSequence: (sequenceKey: string) => Promise<boolean>;
}

const SEQUENCE_TEXT: Record<string, string> = {
  active: 'Follow-ups running',
  completed: 'Follow-ups finished',
  stopped: 'Follow-ups stopped',
};

/** "Ad lead follow-ups running", or plain "Follow-ups running" for a key with no label (e.g. a retired set). */
function sequenceStatusText(status: string, sequenceKey: string | null): string {
  const text = SEQUENCE_TEXT[status] ?? 'Follow-ups';
  if (!sequenceKey || !Object.hasOwn(SEQUENCE_LABELS, sequenceKey)) return text;
  return `${SEQUENCE_LABELS[sequenceKey]} ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/** Shown on the lead page only until the lead's one-and-only sequence has been started. */
function StartSequencePanel({ sequences, onStart }: { sequences: SequenceStartInfo; onStart: (sequenceKey: string) => Promise<boolean> }) {
  const keys = Object.keys(SEQUENCE_LABELS);
  // No recommendation means no preselected set: a person has to choose one deliberately.
  const [selected, setSelected] = useState(sequences.recommended ?? '');
  const [starting, setStarting] = useState(false);

  if (sequences.starting) {
    return <p className="text-sm text-fm-neutral-700">Starting follow-ups…</p>;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="sequence-key" className="block text-xs font-medium text-fm-neutral-700">
        Follow-up set
      </label>
      <Select id="sequence-key" value={selected} onChange={(e) => setSelected(e.target.value)} disabled={starting}>
        {!sequences.recommended && (
          <option value="" disabled>
            Choose a set
          </option>
        )}
        {keys.map((key) => (
          <option key={key} value={key}>
            {SEQUENCE_LABELS[key]}
          </option>
        ))}
      </Select>
      {sequences.canStart ? (
        <DashboardButton
          variant="secondary"
          size="sm"
          disabled={starting || !selected}
          onClick={async () => {
            if (!selected) return;
            setStarting(true);
            try {
              await onStart(selected);
            } finally {
              setStarting(false);
            }
          }}
        >
          {starting ? 'Starting…' : 'Start follow-ups'}
        </DashboardButton>
      ) : (
        <p className="text-xs text-fm-neutral-600">{sequences.blockedReason}</p>
      )}
    </div>
  );
}

export function LeadDetailHeader({
  lead,
  owners,
  canAssign,
  userId,
  suppressed,
  sequences,
  onStageChange,
  onOwnerChange,
  onStopSequence,
  onStartSequence,
}: LeadDetailHeaderProps) {
  const [losing, setLosing] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [submittingLost, setSubmittingLost] = useState(false);

  const source = [lead.source?.replace(/_/g, ' '), lead.sourceDetail].filter(Boolean).join(' · ');
  const campaign = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ');

  return (
    <DashboardCard variant="admin">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fm-neutral-900">{lead.name}</h1>
            <p className="text-fm-neutral-600">{lead.company ?? 'No company given'}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-fm-magenta-700 hover:underline">
                  <Mail className="h-4 w-4" />
                  {lead.email}
                </a>
              )}
              {lead.phoneE164 && (
                <a href={`tel:${lead.phoneE164}`} className="inline-flex items-center gap-1 text-fm-magenta-700 hover:underline">
                  <Phone className="h-4 w-4" />
                  {lead.phoneE164}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead.priority && <StatusBadge status={lead.priority}>{lead.priority}</StatusBadge>}
            <span className="text-sm font-semibold text-fm-neutral-900">Score {lead.leadScore ?? 0}/100</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="lead-stage" className="block text-sm font-medium text-fm-neutral-800">
              Stage
            </label>
            <Select
              id="lead-stage"
              value={losing ? 'lost' : lead.status}
              onChange={(e) => {
                const next = e.target.value;
                if (!isLeadStatus(next)) return;
                if (next === 'lost') {
                  setLosing(true);
                  return;
                }
                setLosing(false);
                onStageChange(next);
              }}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STAGE_LABELS[status]}
                </option>
              ))}
            </Select>
            {losing && (
              <div className="space-y-2">
                <label htmlFor="lost-reason" className="block text-xs font-medium text-fm-neutral-700">
                  Why was it lost?
                </label>
                <input
                  id="lost-reason"
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Chose another agency, no budget, no reply…"
                  className="w-full rounded-md border border-fm-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                />
                <div className="flex gap-2">
                  <DashboardButton
                    variant="danger"
                    size="sm"
                    disabled={lostReason.trim().length < 3 || submittingLost}
                    onClick={async () => {
                      setSubmittingLost(true);
                      try {
                        // Keep the reason form open with its text until the save actually
                        // succeeds — a failed request must not lose what was typed.
                        const saved = await onStageChange('lost', lostReason.trim());
                        if (saved) {
                          setLosing(false);
                          setLostReason('');
                        }
                      } finally {
                        setSubmittingLost(false);
                      }
                    }}
                  >
                    {submittingLost ? 'Marking…' : 'Mark lost'}
                  </DashboardButton>
                  <DashboardButton variant="ghost" size="sm" onClick={() => setLosing(false)} disabled={submittingLost}>
                    Cancel
                  </DashboardButton>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="lead-owner" className="block text-sm font-medium text-fm-neutral-800">
              Owner
            </label>
            {canAssign ? (
              <Select id="lead-owner" value={lead.ownerId ?? ''} onChange={(e) => onOwnerChange(e.target.value || null)}>
                <option value="">Unassigned</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <p id="lead-owner" className="text-sm text-fm-neutral-900">
                  {lead.assignedTo ?? 'Unassigned'}
                </p>
                {lead.ownerId === null && (
                  <DashboardButton variant="secondary" size="sm" onClick={() => onOwnerChange(userId)}>
                    Take this lead
                  </DashboardButton>
                )}
                {lead.ownerId === userId && (
                  <DashboardButton variant="ghost" size="sm" onClick={() => onOwnerChange(null)}>
                    Release
                  </DashboardButton>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fm-neutral-800">Follow-ups</p>
            {lead.sequenceStatus ? (
              <>
                <p className="text-sm text-fm-neutral-700">
                  {sequenceStatusText(lead.sequenceStatus, lead.sequenceKey)}
                  {lead.sequenceStopReason ? ` (${lead.sequenceStopReason.replace(/_/g, ' ')})` : ''}
                </p>
                {lead.sequenceStatus === 'active' && (
                  <DashboardButton variant="secondary" size="sm" onClick={onStopSequence}>
                    Stop follow-ups
                  </DashboardButton>
                )}
              </>
            ) : (
              <StartSequencePanel sequences={sequences} onStart={onStartSequence} />
            )}
            {suppressed && <p className="text-xs font-medium text-red-600">On the do-not-contact list</p>}
          </div>
        </div>

        <p className="text-xs text-fm-neutral-500">
          Came in via {source || 'unknown source'}
          {campaign ? ` · ${campaign}` : ''}
          {lead.lostReason ? ` · Lost: ${lead.lostReason}` : ''}
        </p>
      </CardContent>
    </DashboardCard>
  );
}
