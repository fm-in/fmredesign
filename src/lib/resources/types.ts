/**
 * Resources — shared domain types.
 *
 * Client-safe: no server imports. Mirrors migrations/2026-08-13-resources.sql.
 */

/** Content types the hub publishes. See the migration for what each means. */
export type ResourceType = 'news' | 'guide' | 'checklist' | 'template' | 'tool' | 'glossary';

/**
 * The three intents the hub serves. A piece may serve more than one, which is
 * why this is stored as an array rather than a single column.
 */
export type Audience = 'professionals' | 'aspiring' | 'owners';

export type ResourceCategory =
  | 'search'
  | 'social'
  | 'paid'
  | 'content'
  | 'brand'
  | 'analytics'
  | 'ai_automation'
  | 'industry';

export type ResourceStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type Region = 'india' | 'global';

export interface Resource {
  id: string;
  type: ResourceType;
  slug: string | null;
  title: string;
  excerpt: string | null;
  bodyHtml: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceLogoUrl: string | null;
  category: ResourceCategory | null;
  tags: string[];
  audience: Audience[];
  region: Region | null;
  status: ResourceStatus;
  featured: boolean;
  coverImageUrl: string | null;
  readMinutes: number | null;
  authorName: string | null;
  relevanceScore: number | null;
  publishedAt: string | null;
}

/** Human labels. Kept here so the hub and admin never disagree. */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  news: 'News',
  guide: 'Guide',
  checklist: 'Checklist',
  template: 'Template',
  tool: 'Tool',
  glossary: 'Explainer',
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  professionals: 'For marketers',
  aspiring: 'Learning marketing',
  owners: 'For business owners',
};

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  search: 'Search & SEO',
  social: 'Social',
  paid: 'Paid Media',
  content: 'Content',
  brand: 'Brand',
  analytics: 'Analytics',
  ai_automation: 'AI & Automation',
  industry: 'Industry',
};
