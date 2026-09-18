/** Human follow-up work: calls, WhatsApp and LinkedIn messages a person sends. */

import { getSupabaseAdmin } from '@/lib/supabase';
import { recordActivity } from '@/lib/sales/activity';
import { generateSalesId, SYSTEM_ACTOR } from '@/lib/sales/types';
import type { Actor, TaskRow, TaskType } from '@/lib/sales/types';

export interface CreateTaskInput {
  leadId: string;
  ownerId: string | null;
  type: TaskType;
  title: string;
  draftBody?: string | null;
  dueAt: string;
  createdBy?: Actor;
}

export async function createTask(input: CreateTaskInput): Promise<string> {
  const id = generateSalesId('task');
  const createdBy = input.createdBy ?? SYSTEM_ACTOR;

  const { error } = await getSupabaseAdmin().from('sales_tasks').insert({
    id,
    lead_id: input.leadId,
    owner_id: input.ownerId,
    type: input.type,
    title: input.title,
    draft_body: input.draftBody ?? null,
    due_at: input.dueAt,
    status: 'open',
    created_by: createdBy.id,
  });
  if (error) throw error;

  await recordActivity({
    leadId: input.leadId,
    type: 'task_created',
    actor: createdBy,
    subject: input.title,
    metadata: { taskId: id, taskType: input.type, dueAt: input.dueAt },
  });
  return id;
}

export async function hasOpenTask(leadId: string, title: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('sales_tasks')
    .select('id')
    .eq('lead_id', leadId)
    .eq('title', title)
    .eq('status', 'open')
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/** Mark an open task done or skipped. Returns null if it was not open. */
export async function completeTask(taskId: string, status: 'done' | 'skipped', actor: Actor): Promise<TaskRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('sales_tasks')
    .update({ status, completed_at: new Date().toISOString(), completed_by: actor.id })
    .eq('id', taskId)
    .eq('status', 'open')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const task: TaskRow = data;
  await recordActivity({
    leadId: task.lead_id,
    type: 'task_completed',
    actor,
    subject: task.title,
    metadata: { taskId, status },
  });
  return task;
}
