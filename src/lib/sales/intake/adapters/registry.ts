import { connectorAdapter } from './connector';
import { googleAdapter } from './google';
import type { SalesWebhookAdapter } from './types';

export const SALES_WEBHOOK_ADAPTERS: Readonly<Record<string, SalesWebhookAdapter>> = {
  google: googleAdapter,
  connector: connectorAdapter,
};

export function getAdapter(source: string): SalesWebhookAdapter | null {
  return Object.prototype.hasOwnProperty.call(SALES_WEBHOOK_ADAPTERS, source) ? SALES_WEBHOOK_ADAPTERS[source] : null;
}

export function isAdapterConfigured(adapter: SalesWebhookAdapter): boolean {
  return adapter.requiredEnv.every((name) => Boolean(process.env[name]));
}
