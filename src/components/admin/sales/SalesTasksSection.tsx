'use client';

import { useCallback, useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { adminToast } from '@/lib/admin/toast';
import type { SalesTaskItem } from '@/lib/sales/api-types';
import { SalesTaskList } from './SalesTaskList';

/** Open sales tasks for the signed-in person. Renders nothing for people outside the sales team. */
export function SalesTasksSection() {
  const [tasks, setTasks] = useState<SalesTaskItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sales/tasks?scope=mine&status=open');
      if (res.status === 401 || res.status === 403) {
        setTasks(null);
        return;
      }
      const json = await res.json();
      setTasks(json.success ? json.data : []);
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function complete(taskId: string, status: 'done' | 'skipped') {
    try {
      const res = await fetch(`/api/admin/sales/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        adminToast.success(status === 'done' ? 'Task done' : 'Task skipped');
        load();
      } else {
        adminToast.error('Could not update the task. Try again.');
      }
    } catch {
      adminToast.error('Could not update the task. Try again.');
    }
  }

  if (tasks === null) return null;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fm-neutral-900">
        <Target className="h-5 w-5" />
        Sales tasks ({tasks.length})
      </h2>
      <SalesTaskList tasks={tasks} showLead onComplete={complete} emptyText="No open sales tasks." />
    </section>
  );
}
