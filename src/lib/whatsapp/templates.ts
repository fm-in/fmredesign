/**
 * Approved templates, read from Meta.
 *
 * Nothing here is stored. Meta owns approval, and it changes state without
 * telling us — a template can be paused for poor quality, or rejected on
 * re-review, hours after it last worked. A mirrored copy would confidently
 * offer a template that now fails, which is worse than asking every time.
 *
 * The cache below is 60 seconds: enough that opening the inbox does not make
 * a Graph call per keystroke, short enough that a pause is noticed quickly.
 */

import { templateParam } from '@/lib/whatsapp/client';
import { firstNameOf } from '@/lib/sales/emails';
import type { LeadRow } from '@/lib/sales/types';
import type { TemplateSend } from '@/lib/whatsapp/client';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const CACHE_MS = 60_000;

export interface ApprovedTemplate {
  name: string;
  language: string;
  category: string;
  /** The body text as approved, placeholders and all, so a person can see what they are sending. */
  body: string;
  /** How many `{{n}}` the body carries. */
  variables: number;
}

let cache: { at: number; templates: ApprovedTemplate[] } | null = null;

interface RawComponent {
  type?: string;
  text?: string;
}
interface RawTemplate {
  name?: string;
  language?: string;
  category?: string;
  status?: string;
  components?: RawComponent[];
}

function bodyOf(template: RawTemplate): string {
  return template.components?.find((c) => c.type === 'BODY')?.text ?? '';
}

function variableCount(body: string): number {
  return new Set(body.match(/\{\{\d+\}\}/g) ?? []).size;
}

/** Every APPROVED template on the WABA. Returns [] when Meta cannot be reached. */
export async function listApprovedTemplates(): Promise<ApprovedTemplate[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.templates;

  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return [];

  try {
    const response = await fetch(`${GRAPH_BASE}/${waba}/message_templates?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return cache?.templates ?? [];

    const json: unknown = await response.json();
    const raw = (json as { data?: RawTemplate[] }).data ?? [];

    const templates = raw
      .filter((t) => t.status === 'APPROVED' && t.name)
      .map((t): ApprovedTemplate => {
        const body = bodyOf(t);
        return {
          name: t.name!,
          language: t.language ?? 'en',
          category: t.category ?? '',
          body,
          variables: variableCount(body),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    cache = { at: Date.now(), templates };
    return templates;
  } catch {
    // Never leave the inbox with nothing because Graph blipped.
    return cache?.templates ?? [];
  }
}

export async function findTemplate(name: string): Promise<ApprovedTemplate | null> {
  return (await listApprovedTemplates()).find((t) => t.name === name) ?? null;
}

/**
 * Fill a template's placeholders from a lead.
 *
 * Deliberately positional and generic: `{{1}}` is the person, `{{2}}` what
 * they asked about, `{{3}}` who is handling it, which is the order
 * `enquiry_first_touch` uses and the order the templates still to be approved
 * were written in. Anything beyond three gets a neutral filler rather than
 * being left empty, because Cloud API rejects the whole message on an empty
 * parameter — a visibly generic word is recoverable, a silent failure is not.
 */
export function buildTemplateSend(template: ApprovedTemplate, lead: LeadRow, senderName: string): TemplateSend {
  const candidates = [
    templateParam(firstNameOf(lead.name), 'there'),
    templateParam(projectPhrase(lead), 'your project'),
    templateParam(senderName, 'the Freaking Minds team'),
  ];

  return {
    name: template.name,
    language: template.language,
    bodyParams: Array.from({ length: template.variables }, (_, i) => candidates[i] ?? 'your project'),
  };
}

function projectPhrase(lead: LeadRow): string | null {
  const custom = (lead.custom_fields && typeof lead.custom_fields === 'object' ? lead.custom_fields : {}) as Record<
    string,
    unknown
  >;
  const service = typeof custom.service === 'string' ? custom.service : null;
  if (service) return service;
  if (typeof lead.project_type === 'string' && lead.project_type) return lead.project_type.replace(/_/g, ' ');
  return null;
}

/** Testing seam: the cache is module state and would otherwise leak between cases. */
export function __resetTemplateCache(): void {
  cache = null;
}
