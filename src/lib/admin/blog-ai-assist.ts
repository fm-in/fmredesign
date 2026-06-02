/**
 * Blog AI assist — calls Groq (Llama 3.3 70B) to suggest metadata for an
 * uploaded post: title, excerpt, slug, tags, SEO copy.
 *
 * Designed to *suggest*, not overwrite. The admin always sees these fields
 * pre-filled in the editor and can edit before publishing.
 *
 * Graceful degradation: if GROQ_API_KEY isn't set, returns an empty
 * suggestion object so the rest of the upload pipeline still works.
 */

import { slugify, type PostTag } from './blog-types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface AiSuggestion {
  title?: string;
  slug?: string;
  excerpt?: string;
  tags?: PostTag[];
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  warnings?: string[];
}

interface AiAssistInput {
  /** Plain-text body, used as the LLM input. Caller can truncate for cost. */
  text: string;
  /** Title hinted from the file (e.g. first H1 or frontmatter). Optional. */
  hintedTitle?: string;
}

/** Returns suggestions or `{}` if AI isn't configured / the call fails. */
export async function suggestPostMetadata(input: AiAssistInput): Promise<AiSuggestion> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY not set — blog AI assist disabled.');
    return {};
  }

  // Cap the input length to keep token costs predictable. 8000 chars ≈
  // 2000 tokens, well within Llama 3.3 context.
  const trimmedText = input.text.slice(0, 8000);

  const systemPrompt = `You are an editor at Freaking Minds, a digital marketing agency in Bhopal, India.
You help structure blog posts written by the team.
Always respond with valid JSON matching the requested schema. No prose, no markdown fences.`;

  const userPrompt = `Read this blog post draft and return suggested metadata.

${input.hintedTitle ? `The author hinted at this title: "${input.hintedTitle}"` : ''}

Draft body:
"""
${trimmedText}
"""

Return ONLY a JSON object with these keys:
{
  "title":            string (≤ 75 chars, punchy, no clickbait, no emoji),
  "slug":             string (lowercase, hyphen-separated, ≤ 60 chars, URL-safe),
  "excerpt":          string (≤ 160 chars, one sentence, ends with period),
  "tags":             string[] (3-5 short tags relevant to digital marketing / the post topic),
  "category":         string (one of: "Marketing", "Design", "Strategy", "AI", "SEO", "Social Media", "Performance", "Web", "Brand", "Case Studies"),
  "seoTitle":         string (≤ 60 chars, optimised for Google),
  "seoDescription":   string (≤ 155 chars, includes the main keyword once)
}
`;

  let body: { choices?: Array<{ message?: { content?: string } }> } | null = null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq API error', res.status, errText.slice(0, 200));
      return { warnings: [`AI assist failed (${res.status})`] };
    }
    body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  } catch (e) {
    console.error('Groq fetch threw', e);
    return { warnings: ['AI assist network error'] };
  }

  const raw = body?.choices?.[0]?.message?.content;
  if (!raw) return { warnings: ['AI assist returned no content'] };

  let parsed: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    tags: string[];
    category: string;
    seoTitle: string;
    seoDescription: string;
  }>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('Groq returned non-JSON:', raw.slice(0, 200));
    return { warnings: ['AI assist returned invalid JSON'] };
  }

  return {
    title: clamp(parsed.title, 100),
    slug: parsed.slug ? slugify(parsed.slug) : undefined,
    excerpt: clamp(parsed.excerpt, 200),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((t): t is string => typeof t === 'string' && t.length > 0)
          .slice(0, 6)
          .map((name) => ({ name, slug: slugify(name) }))
      : undefined,
    category: typeof parsed.category === 'string' ? parsed.category : undefined,
    seoTitle: clamp(parsed.seoTitle, 70),
    seoDescription: clamp(parsed.seoDescription, 170),
  };
}

function clamp(s: string | undefined, max: number): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const t = s.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max).trimEnd() : t;
}
