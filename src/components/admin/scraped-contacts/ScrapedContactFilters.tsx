/**
 * ScrapedContactFilters Component
 * Renders search, source filter, has-contact toggle, sort, and view mode controls.
 */

'use client';

import { Search } from 'lucide-react';
import { DashboardButton, DashboardCard } from '@/design-system';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import type { ScrapedContactFilters as FiltersType, SourcePlatform, ProjectTag } from '@/lib/admin/scraped-contact-types';
import { SOURCE_OPTIONS, PROJECT_TAG_OPTIONS } from '@/lib/admin/scraped-contact-types';

interface ScrapedContactFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  sourceFiles?: string[];
}

export function ScrapedContactFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  sortDirection,
  onSortChange,
  viewMode,
  onViewModeChange,
  sourceFiles = [],
}: ScrapedContactFiltersProps) {
  return (
    <DashboardCard variant="admin" className="p-4">
      <div className="space-y-3">
        {/* Row 1: Search + View toggle */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-fm-neutral-200 rounded-lg p-1 flex-shrink-0">
            <DashboardButton
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="text-xs"
            >
              Table
            </DashboardButton>
            <DashboardButton
              variant={viewMode === 'cards' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('cards')}
              className="text-xs"
            >
              Cards
            </DashboardButton>
          </div>
        </div>

        {/* Row 2: Filters + Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm text-fm-neutral-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={filters.hasContact !== false}
              onChange={(e) =>
                onFiltersChange({ ...filters, hasContact: e.target.checked ? true : false })
              }
              className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
            />
            Has contact info
          </label>

          <Select
            value={filters.sourcePlatform?.[0] || ''}
            onChange={(e) => {
              const val = e.target.value as SourcePlatform;
              onFiltersChange({
                ...filters,
                sourcePlatform: val ? [val] : undefined,
              });
            }}
          >
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          {sourceFiles.length > 0 && (
            <Select
              value={filters.sourceFile || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  sourceFile: e.target.value || undefined,
                });
              }}
            >
              <option value="">All Batches</option>
              {sourceFiles.map((sf) => (
                <option key={sf} value={sf}>
                  {sf}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={filters.projectTag || ''}
            onChange={(e) => {
              onFiltersChange({
                ...filters,
                projectTag: (e.target.value as ProjectTag) || undefined,
              });
            }}
          >
            <option value="">All Projects</option>
            {PROJECT_TAG_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>

          <div className="ml-auto">
            <Select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                onSortChange(field, direction as 'asc' | 'desc');
              }}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="companyName-asc">Company A-Z</option>
              <option value="companyName-desc">Company Z-A</option>
              <option value="country-asc">Country A-Z</option>
            </Select>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
