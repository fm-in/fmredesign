/**
 * LeadFilters Component
 * Renders the search bar, filter button, sort dropdown, and view mode toggle.
 */

'use client';

import { Search } from 'lucide-react';
import { DashboardButton, DashboardCard } from '@/design-system';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';

interface LeadFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
}

export function LeadFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  viewMode,
  onViewModeChange,
}: LeadFiltersProps) {
  return (
    <DashboardCard variant="admin" className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 sm:space-y-4 md:space-y-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          {/* Filter controls are inline — no separate button needed */}
        </div>

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
            <option value="leadScore-desc">Highest Score</option>
            <option value="leadScore-asc">Lowest Score</option>
            <option value="company-asc">Company A-Z</option>
            <option value="company-desc">Company Z-A</option>
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
