/**
 * Scrape Job Types
 * Type definitions for the automated lead scraping system.
 */

export type ScrapeSourcePlatform = 'bni' | 'google_maps' | 'linkedin' | 'other';
export type ScrapeScheduleType = 'manual' | 'daily' | 'weekly' | 'rotation';
export type ScrapeRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ScrapeRunTrigger = 'system' | 'manual' | 'rotation';

export interface ScrapeJob {
  id: string;
  name: string;
  sourcePlatform: ScrapeSourcePlatform;
  params: Record<string, unknown>;
  scheduleType: ScrapeScheduleType;
  isActive: boolean;
  rotationGroupId: string | null;
  createdBy: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined from latest run
  latestRun?: ScrapeJobRun | null;
}

export interface ScrapeJobRun {
  id: string;
  jobId: string;
  status: ScrapeRunStatus;
  runParams: Record<string, unknown>;
  contactsFound: number;
  contactsImported: number;
  contactsSkipped: number;
  errorMessage: string | null;
  triggeredBy: ScrapeRunTrigger;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  // Joined
  jobName?: string;
  jobSourcePlatform?: ScrapeSourcePlatform;
}

export interface ScrapeRotationConfig {
  id: string;
  name: string;
  sourcePlatform: ScrapeSourcePlatform;
  countries: string[];
  industries: (string | number)[];
  currentCountryIndex: number;
  currentIndustryIndex: number;
  runsPerDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeSourceConfig {
  id: string;
  sourcePlatform: ScrapeSourcePlatform;
  config: Record<string, unknown>;
  isValid: boolean;
  lastValidatedAt: string | null;
  validationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeJobStats {
  totalJobs: number;
  activeJobs: number;
  totalRuns: number;
  totalContactsImported: number;
  recentRuns: ScrapeJobRun[];
}

export interface ScrapeRotationSuggestion {
  type: 'country' | 'industry';
  value: string;
  reason: string;
  metric?: string;
}

export const SOURCE_PLATFORM_OPTIONS: { value: ScrapeSourcePlatform; label: string; description: string; disabled?: boolean }[] = [
  { value: 'bni', label: 'BNI', description: 'BNI Connect Global directory' },
  { value: 'google_maps', label: 'Google Maps', description: 'Google Places API (official)' },
  { value: 'linkedin', label: 'LinkedIn', description: 'LinkedIn (not yet implemented)', disabled: true },
  { value: 'other', label: 'Other', description: 'Custom source' },
];

export const SCHEDULE_TYPE_OPTIONS: { value: ScrapeScheduleType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'rotation', label: 'Rotation' },
];

export const GOOGLE_MAPS_COUNTRIES = [
  'India', 'UAE', 'United States', 'United Kingdom',
  'Australia', 'Philippines', 'Singapore', 'Canada',
  'Germany', 'France',
];

export const GOOGLE_MAPS_MAX_RESULTS = [
  { value: 1, label: '~20 results (1 page)' },
  { value: 2, label: '~40 results (2 pages)' },
  { value: 3, label: '~60 results (3 pages)' },
];

export const RUN_STATUS_OPTIONS: { value: ScrapeRunStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'running', label: 'Running', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
];
