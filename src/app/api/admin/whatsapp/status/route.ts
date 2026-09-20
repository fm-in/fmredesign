/**
 * Settings → WhatsApp: what Meta thinks the connection looks like.
 *
 * Read-only. Everything here lives on Meta's side — the number, its quality
 * rating, the approved templates, and whether an app is subscribed to the
 * WABA — and none of it is worth mirroring into our database, where it would
 * immediately start to drift.
 *
 * Templates in particular are authored and approved in Meta's own interface.
 * This lists them so the code can be checked against what is actually
 * approved; it deliberately does not offer to create one.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { SITE_URL } from '@/lib/site-url';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const REQUIRED_ENV = [
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_WABA_ID',
] as const;

interface GraphOutcome<T> {
  data: T | null;
  error: string | null;
}

/**
 * One Graph read. Never throws and never returns Meta's raw body: an error
 * from Graph quotes the request back, so only the message is kept.
 */
async function graph<T>(path: string, token: string): Promise<GraphOutcome<T>> {
  try {
    const response = await fetch(`${GRAPH_BASE}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof json === 'object' && json !== null && 'error' in json &&
        typeof (json as { error: unknown }).error === 'object' && (json as { error: unknown }).error !== null &&
        'message' in (json as { error: Record<string, unknown> }).error
          ? String((json as { error: Record<string, unknown> }).error.message)
          : `HTTP ${response.status}`;
      return { data: null, error: message.slice(0, 200) };
    }
    return { data: json as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return { data: null, error: message.slice(0, 200) };
  }
}

interface NumberInfo {
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
}

interface TemplateInfo {
  name?: string;
  language?: string;
  category?: string;
  status?: string;
  components?: Array<{ type?: string; text?: string }>;
}

/** How many `{{n}}` placeholders a template's body carries. */
function variableCount(template: TemplateInfo): number {
  const body = template.components?.find((component) => component.type === 'BODY');
  if (!body?.text) return 0;
  return new Set(body.text.match(/\{\{\d+\}\}/g) ?? []).size;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_WABA_ID;

  const { data: lastDelivery } = await getSupabaseAdmin()
    .from('webhook_logs')
    .select('created_at, error, processed')
    .eq('provider', 'sales:whatsapp')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const webhook = {
    url: `${SITE_URL}/api/webhooks/sales/whatsapp`,
    lastReceivedAt: lastDelivery?.created_at ?? null,
    lastError: lastDelivery?.error ?? null,
  };

  // Without credentials there is nothing to ask Meta, but the checklist above
  // is still the useful half of the answer.
  if (!token || !phoneNumberId || !wabaId) {
    return ApiResponse.success({
      configured: false,
      missingEnv,
      webhook,
      number: null,
      templates: [],
      subscribedApps: null,
      graphError: null,
    });
  }

  const [numberResult, templatesResult, subscriptionResult] = await Promise.all([
    graph<NumberInfo>(
      `${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
      token
    ),
    graph<{ data?: TemplateInfo[] }>(`${wabaId}/message_templates?limit=100`, token),
    graph<{ data?: unknown[] }>(`${wabaId}/subscribed_apps`, token),
  ]);

  const templates = (templatesResult.data?.data ?? []).map((template) => ({
    name: template.name ?? '(unnamed)',
    language: template.language ?? '',
    category: template.category ?? '',
    status: template.status ?? '',
    variables: variableCount(template),
  }));

  return ApiResponse.success({
    configured: missingEnv.length === 0,
    missingEnv,
    webhook,
    number: numberResult.data
      ? {
          displayPhoneNumber: numberResult.data.display_phone_number ?? null,
          verifiedName: numberResult.data.verified_name ?? null,
          qualityRating: numberResult.data.quality_rating ?? null,
          verified: numberResult.data.code_verification_status === 'VERIFIED',
        }
      : null,
    templates,
    /*
     * The switch that decides whether anything reaches us at all. An empty
     * list means Meta is sending webhooks nowhere, however correct the
     * callback URL is — which is not visible from our side any other way.
     */
    subscribedApps: subscriptionResult.data ? (subscriptionResult.data.data ?? []).length : null,
    graphError: numberResult.error ?? templatesResult.error ?? subscriptionResult.error,
  });
}
