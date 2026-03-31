/**
 * ScrapedContactFilters Component
 * Renders search, source filter, has-contact toggle, sort, and view mode controls.
 */

'use client';

import { Search } from 'lucide-react';
import { DashboardButton, DashboardCard } from '@/design-system';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import type { ScrapedContactFilters as FiltersType, SourcePlatform } from '@/lib/admin/scraped-contact-types';
import { SOURCE_OPTIONS } from '@/lib/admin/scraped-contact-types';

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left side: search + filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Has Contact toggle */}
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

          {/* Source filter */}
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

          {/* Scrape batch filter */}
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
        </div>

        {/* Right side: sort + view mode */}
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center gap-1 bg-white border border-fm-neutral-200 rounded-lg p-1">
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
      </div>
    </DashboardCard>
  );
}
