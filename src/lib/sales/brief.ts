/**
 * AI-written lead brief and message drafts, always with a template fallback:
 * a missing key, a slow provider or malformed output must never block intake.
 */

import { createProvider, getDefaultConfig } from '@/lib/ai/providers';
import type { LLMMessage } from '@/lib/ai/types';
import { firstNameOf, TEAM_SIGNATURE } from '@/lib/sales/emails';
import type { ActivityRow, LeadRow, MeetingRow } from '@/lib/sales/types';

export interface LeadBrief {
  brief: string;
  draft: string;
  aiGenerated: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  website_form: 'the website enquiry form',
  scorecard: 'the marketing scorecard',
  meta_lead_ads: 'a Meta lead ad',
  google_lead_form: 'a Google lead form',
  connector: 'a connected ad platform',
  cal_booking: 'a Cal.com booking',
};

export function describeSource(lead: Pick<LeadRow, 'source' | 'source_detail'>): string {
  const label = SOURCE_LABELS[lead.source ?? ''] ?? 'an enquiry';
  return lead.source_detail ? `${label} (${lead.source_detail})` : label;
}

function sender(ownerName: string): string {
  return ownerName === TEAM_SIGNATURE ? 'the FreakingMinds team' : `${ownerName} from FreakingMinds`;
}

export function fallbackBrief(lead: LeadRow): string {
  return [
    `${lead.name}${lead.company ? ` from ${lead.company}` : ''} came in through ${describeSource(lead)}.`,
    lead.project_description ? `They wrote: "${lead.project_description.slice(0, 300)}"` : 'They did not leave a message.',
    lead.budget_range ? `Budget: ${lead.budget_range.replace(/_/g, ' ')}.` : 'Budget not stated.',
    `Score ${lead.lead_score ?? 0}/100 (${lead.priority ?? 'unscored'}).`,
    'Suggested next step: reply within the hour and offer a 15-minute call.',
  ].join('\n');
}

export function fallbackFirstTouchDraft(lead: LeadRow, ownerName: string): string {
  return `Hi ${firstNameOf(lead.name)}, this is ${sender(ownerName)}. Thanks for your enquiry${
    lead.company ? ` about ${lead.company}` : ''
  }. Would a quick 15-minute call today or tomorrow work, so we can understand what you need?`;
}

export function fallbackFollowUpDraft(lead: LeadRow, ownerName: string): string {
  return `Hi ${firstNameOf(lead.name)}, ${sender(ownerName)} again. Just checking whether you saw my email. Happy to share a few quick ideas on a short call whenever it suits you.`;
}

export function buildBriefMessages(lead: LeadRow, ownerName: string): LLMMessage[] {
  const facts = {
    name: lead.name,
    company: lead.company,
    website: lead.website,
    source: describeSource(lead),
    message: lead.project_description,
    budget: lead.budget_range,
    timeline: lead.timeline,
    companySize: lead.company_size,
    industry: lead.industry,
    formAnswers: lead.custom_fields ?? {},
    score: lead.lead_score,
  };

  return [
    {
      role: 'system',
      content:
        'You help the sales team at FreakingMinds, a digital marketing agency in India (SEO, social media, performance ads, branding, websites, content). Be specific, plain and brief. Never invent facts that are not in the lead data. Respond with JSON only.',
    },
    {
      role: 'user',
      content: `Lead data:\n${JSON.stringify(facts, null, 2)}\n\nReturn JSON with two string fields:\n"brief": at most 5 short lines covering who they are, what they asked for, likely fit, the service to pitch first, and a suggested opening line.\n"draft": a WhatsApp message of at most 60 words from ${sender(ownerName)}, warm and direct, ending with a question that proposes a short call. No emojis, no placeholders.`,
    },
  ];
}

function isBrief(value: unknown): value is { brief: string; draft: string } {
  if (typeof value !== 'object' || value === null) return false;
  const fields = new Map(Object.entries(value));
  const brief = fields.get('brief');
  const draft = fields.get('draft');
  return typeof brief === 'string' && brief.trim() !== '' && typeof draft === 'string' && draft.trim() !== '';
}

export async function generateLeadBrief(lead: LeadRow, ownerName: string): Promise<LeadBrief> {
  const fallback: LeadBrief = {
    brief: fallbackBrief(lead),
    draft: fallbackFirstTouchDraft(lead, ownerName),
    aiGenerated: false,
  };

  try {
    const config = getDefaultConfig();
    const result = await createProvider(config.provider).generateJSON<unknown>(buildBriefMessages(lead, ownerName), {
      ...config,
      temperature: 0.4,
      maxTokens: 700,
    });
    if (!isBrief(result)) return fallback;
    return { brief: result.brief.trim().slice(0, 2000), draft: result.draft.trim().slice(0, 1000), aiGenerated: true };
  } catch (err) {
    console.warn('[sales] AI brief unavailable, using template:', err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function generateMeetingBrief(lead: LeadRow, meeting: MeetingRow, activities: ActivityRow[]): Promise<string> {
  const when = new Date(meeting.starts_at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const fallback = [
    `Call with ${lead.name}${lead.company ? ` (${lead.company})` : ''} at ${when} IST.`,
    `Came in through ${describeSource(lead)}.`,
    lead.project_description ? `In their words: "${lead.project_description.slice(0, 300)}"` : '',
    `${activities.length} touches so far.`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const config = getDefaultConfig();
    const history = activities.slice(0, 15).map((a) => ({
      type: a.type,
      at: a.occurred_at,
      subject: a.subject,
      body: a.body ? a.body.slice(0, 400) : null,
    }));
    const response = await createProvider(config.provider).generate(
      [
        {
          role: 'system',
          content:
            'You prepare FreakingMinds sales staff for discovery calls. Plain text, at most 8 short lines: who they are, what they want, what they have already told us, three questions to ask, and the likely service fit. Never invent facts.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              lead: {
                name: lead.name,
                company: lead.company,
                website: lead.website,
                source: describeSource(lead),
                message: lead.project_description,
                budget: lead.budget_range,
                formAnswers: lead.custom_fields ?? {},
              },
              history,
            },
            null,
            2
          ),
        },
      ],
      { ...config, temperature: 0.3, maxTokens: 600 }
    );
    return response.content.trim() || fallback;
  } catch {
    return fallback;
  }
}
