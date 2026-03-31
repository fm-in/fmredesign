/**
 * Scraped Contact Types
 * Type definitions for the scraped contacts management system.
 */

export type ScrapedContactStatus = 'new' | 'contacted' | 'converted' | 'invalid' | 'archived';
export type SourcePlatform = 'bni' | 'linkedin' | 'google_maps' | 'indeed' | 'csv_import' | 'other';

export interface ScrapedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  companyName: string | null;
  category: string | null;
  speciality: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  addressFull: string | null;
  businessDescription: string | null;
  keywords: string | null;
  socialLinks: string | null;
  profileUrl: string | null;
  sourcePlatform: SourcePlatform;
  sourceFile: string | null;
  chapterName: string | null;
  membershipStatus: string | null;
  externalId: string | null;
  status: ScrapedContactStatus;
  notes: string;
  tags: string[];
  linkedLeadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapedContactFilters {
  status?: ScrapedContactStatus[];
  sourcePlatform?: SourcePlatform[];
  sourceFile?: string;
  hasContact?: boolean;
  country?: string;
  searchQuery?: string;
}

export interface ScrapedContactStats {
  total: number;
  withEmail: number;
  withPhone: number;
  byStatus: Record<ScrapedContactStatus, number>;
  bySource: Record<string, number>;
  sourceFiles?: string[];
}

export const STATUS_OPTIONS: { value: ScrapedContactStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'archived', label: 'Archived' },
];

export const SOURCE_OPTIONS: { value: SourcePlatform; label: string }[] = [
  { value: 'bni', label: 'BNI' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'other', label: 'Other' },
];
