'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminToast } from '@/lib/admin/toast';
import type { LeadStatus } from '@/lib/admin/lead-types';
import type { LeadDetailPayload } from '@/lib/sales/api-types';

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<void> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) return;
  const json: unknown = await res.json().catch(() => null);
  const message =
    typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
      ? json.error
      : 'Something went wrong. Try again.';
  throw new Error(message);
}

export function useLeadDetail(leadId: string) {
  const [data, setData] = useState<LeadDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/admin/sales/leads/${encodeURIComponent(leadId)}`;

  const reload = useCallback(async () => {
    try {
      const res = await fetch(base);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load this lead');
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this lead');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<void>, success: string): Promise<boolean> => {
      try {
        await action();
        adminToast.success(success);
        await reload();
        return true;
      } catch (err) {
        adminToast.error(err instanceof Error ? err.message : 'Something went wrong. Try again.');
        // A failed change (e.g. a 409 from a race on owner assignment) can still have
        // altered server state, or leave the UI showing a stale optimistic value. Refresh
        // so the page reflects the lead's real current owner and stage. Never let a
        // failing reload mask the error toast above by throwing out of this handler.
        try {
          await reload();
        } catch {
          // Swallow: the error toast already told the user something went wrong.
        }
        return false;
      }
    },
    [reload]
  );

  return {
    data,
    loading,
    error,
    reload,
    changeStage: (status: LeadStatus, lostReason?: string) =>
      run(() => send(base, 'PATCH', { status, lostReason }), 'Stage updated'),
    changeOwner: (ownerId: string | null) =>
      run(() => send(base, 'PATCH', { ownerId }), ownerId ? 'Owner updated' : 'Lead released'),
    addNote: (body: string) => run(() => send(`${base}/notes`, 'POST', { body }), 'Note added'),
    stopSequence: () => run(() => send(`${base}/sequence`, 'POST', { action: 'stop' }), 'Follow-ups stopped'),
    completeTask: (taskId: string, status: 'done' | 'skipped') =>
      run(
        () => send(`/api/admin/sales/tasks/${encodeURIComponent(taskId)}`, 'PATCH', { status }),
        status === 'done' ? 'Task done' : 'Task skipped'
      ),
    updateMeeting: (meetingId: string, status: 'completed' | 'no_show') =>
      run(
        () => send(`/api/admin/sales/meetings/${encodeURIComponent(meetingId)}`, 'PATCH', { status }),
        status === 'completed' ? 'Call marked as held' : 'Marked as no-show'
      ),
    convertToClient: () => run(() => send('/api/leads/convert', 'POST', { leadId }), 'Converted to client'),
  };
}
