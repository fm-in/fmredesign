/**
 * Send a sales event to Inngest. Never throws: the lead or change that
 * produced the event is already saved, so a failed send is logged, not
 * propagated.
 */

import type { InngestEvents } from '@/lib/inngest/events';

type SalesEventName = Extract<keyof InngestEvents, `sales/${string}`>;

export type SalesEvent = {
  [K in SalesEventName]: { name: K; data: InngestEvents[K]['data'] };
}[SalesEventName];

export async function sendSalesEvent(event: SalesEvent): Promise<void> {
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send(event);
  } catch (err) {
    console.error(`[sales] failed to send ${event.name}:`, err);
  }
}
