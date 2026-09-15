/**
 * Every sales webhook request is written to `webhook_logs`. The unique
 * (provider, external_id) index turns a platform's retry into a duplicate we
 * can recognise, so a lead is never processed twice.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

const UNIQUE_VIOLATION = '23505';
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'x-hub-signature-256', 'x-cal-signature-256', 'svix-signature']);

export interface WebhookLogEntry {
  provider: string;
  eventType: string | null;
  payload: unknown;
  headers: Record<string, string>;
  signatureValid: boolean;
  externalId: string | null;
  error?: string | null;
}

export interface WebhookLogResult {
  id: string | null;
  duplicate: boolean;
  processed: boolean;
}

export function safeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = SECRET_HEADERS.has(key.toLowerCase()) ? '[redacted]' : value;
  });
  return out;
}

export async function logWebhook(entry: WebhookLogEntry): Promise<WebhookLogResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('webhook_logs')
    .insert({
      provider: entry.provider,
      event_type: entry.eventType,
      payload: entry.payload ?? {},
      headers: entry.headers,
      signature_valid: entry.signatureValid,
      processed: false,
      error: entry.error ?? null,
      external_id: entry.externalId,
    })
    .select('id')
    .single();

  if (!error) return { id: data?.id ?? null, duplicate: false, processed: false };

  if (error.code === UNIQUE_VIOLATION && entry.externalId) {
    const { data: existing } = await supabase
      .from('webhook_logs')
      .select('id, processed')
      .eq('provider', entry.provider)
      .eq('external_id', entry.externalId)
      .maybeSingle();
    return { id: existing?.id ?? null, duplicate: true, processed: existing?.processed === true };
  }

  // Logging must never block intake.
  console.error('[sales] webhook log insert failed:', error);
  return { id: null, duplicate: false, processed: false };
}

export async function markWebhook(id: string | null, result: { processed: boolean; error?: string | null }): Promise<void> {
  if (!id) return;
  await getSupabaseAdmin()
    .from('webhook_logs')
    .update({ processed: result.processed, error: result.error ?? null })
    .eq('id', id);
}
