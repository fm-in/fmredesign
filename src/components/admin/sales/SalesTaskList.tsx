'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, MessageCircle, Phone, SkipForward } from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { formatIst, type SalesTaskItem } from '@/lib/sales/api-types';
import type { TaskType } from '@/lib/sales/types';

/** Task types whose draft is a WhatsApp message. Everything else (LinkedIn, Instagram,
 * email, custom) is worked from a copied draft in that channel's own app instead. */
const WHATSAPP_TASK_TYPES: readonly TaskType[] = ['whatsapp', 'call', 'follow_up'];

interface SalesTaskListProps {
  tasks: SalesTaskItem[];
  /** Used when tasks do not carry their lead (the lead page). */
  phoneE164?: string | null;
  /** Show which lead each task belongs to (My Work). */
  showLead?: boolean;
  onComplete: (taskId: string, status: 'done' | 'skipped') => void;
  emptyText?: string;
}

const actionLink =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fm-magenta-500';

export function SalesTaskList({ tasks, phoneE164, showLead = false, onComplete, emptyText = 'No open tasks.' }: SalesTaskListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const open = tasks.filter((task) => task.status === 'open');

  if (open.length === 0) return <p className="text-sm text-fm-neutral-500">{emptyText}</p>;

  async function copyDraft(task: SalesTaskItem) {
    if (!task.draftBody) return;
    try {
      await navigator.clipboard.writeText(task.draftBody);
      setCopiedId(task.id);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <ul className="space-y-3">
      {open.map((task) => {
        const overdue = new Date(task.dueAt).getTime() < Date.now();
        const phone = task.lead?.phoneE164 ?? phoneE164 ?? null;
        const inWhatsApp = Boolean(phone) && WHATSAPP_TASK_TYPES.includes(task.type);

        return (
          <li key={task.id} className="rounded-lg border border-fm-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-fm-neutral-900">{task.title}</p>
                {showLead && task.lead && (
                  <Link href={`/admin/leads/${task.lead.id}`} className="text-sm text-fm-magenta-700 hover:underline">
                    {task.lead.name}
                    {task.lead.company ? ` · ${task.lead.company}` : ''}
                  </Link>
                )}
              </div>
              <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-fm-neutral-500'}`}>
                {overdue ? 'Overdue since ' : 'Due '}
                {formatIst(task.dueAt)}
              </span>
            </div>

            {task.draftBody && (
              <p className="mt-3 whitespace-pre-line rounded-md bg-fm-neutral-50 p-3 text-sm text-fm-neutral-700">{task.draftBody}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {inWhatsApp && (
                /*
                 * The inbox, not a wa.me link.
                 *
                 * `wa.me` opens the reader's OWN WhatsApp and messages the lead
                 * from their personal number. That was the only option while we
                 * had no business number of our own. Now that +91 62681 12515 is
                 * on the Cloud API, using it would mean the customer gets an
                 * automated message from the business and a follow-up from a
                 * stranger's mobile — two identities for one conversation.
                 *
                 * A Cloud API number cannot be opened in the WhatsApp app at
                 * all, so the inbox is the only way to answer as the business.
                 */
                <Link
                  href={`/admin/whatsapp?lead=${task.leadId}`}
                  className={`${actionLink} bg-fm-magenta-700 text-white hover:bg-fm-magenta-800`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Reply in WhatsApp inbox
                </Link>
              )}
              {phone && (
                <a href={`tel:${phone}`} className={`${actionLink} border border-fm-neutral-300 text-fm-neutral-800 hover:bg-fm-neutral-50`}>
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              {task.draftBody && (
                <DashboardButton variant="secondary" size="sm" onClick={() => copyDraft(task)}>
                  <Copy className="h-4 w-4" />
                  {copiedId === task.id ? 'Copied' : 'Copy message'}
                </DashboardButton>
              )}
              <DashboardButton variant="primary" size="sm" onClick={() => onComplete(task.id, 'done')}>
                <Check className="h-4 w-4" />
                Done
              </DashboardButton>
              <DashboardButton variant="ghost" size="sm" onClick={() => onComplete(task.id, 'skipped')}>
                <SkipForward className="h-4 w-4" />
                Skip
              </DashboardButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
