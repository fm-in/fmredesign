/**
 * Scraped Contacts Dashboard
 * View, filter, import, and manage contacts from BNI and other scraping sources.
 *
 * Thin composition layer — data fetching and state live in useScrapedContacts(),
 * UI sections are split into ScrapedContactAnalytics, ScrapedContactFilters, and ScrapedContactTable.
 */

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, Upload, Database, Bot } from 'lucide-react';
import { DashboardButton, MetricCardSkeleton } from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionErrorBoundary } from '@/components/admin/SectionErrorBoundary';
import {
  ScrapedContactAnalytics,
  ScrapedContactFilters,
  ScrapedContactTable,
} from '@/components/admin/scraped-contacts';
import { useScrapedContacts } from '@/hooks/admin/useScrapedContacts';

const ImportModal = dynamic(
  () => import('@/components/admin/scraped-contacts/ImportModal').then((m) => ({ default: m.ImportModal })),
  { ssr: false }
);

export default function ScrapedContactsDashboard() {
  const {
    contacts,
    stats,
    loading,
    selectedContacts,
    setSelectedContacts,
    selectedContact,
    setSelectedContact,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    showImportModal,
    setShowImportModal,
    updateStatus,
    updateNotes,
    updateProjectTag,
    updateAssignedTo,
    deleteContacts,
    importContacts,
    exportContacts,
  } = useScrapedContacts();

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-56" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Scraped Contacts"
        description="Manage contacts from BNI, LinkedIn, and other sources"
        icon={<Database className="w-6 h-6" />}
        actions={
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {selectedContacts.size > 0 && (
              <DashboardButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedContacts.size} selected contact(s)?`)) {
                    deleteContacts(Array.from(selectedContacts));
                  }
                }}
              >
                Delete ({selectedContacts.size})
              </DashboardButton>
            )}
            <DashboardButton variant="secondary" size="sm" onClick={exportContacts}>
              <Download className="w-4 h-4" />
              Export CSV
            </DashboardButton>
            <DashboardButton variant="primary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4" />
              Import JSON
            </DashboardButton>
            <Link href="/admin/scraped-contacts/scrape-jobs">
              <DashboardButton variant="primary" size="sm">
                <Bot className="w-4 h-4" />
                Scrape Jobs
              </DashboardButton>
            </Link>
          </div>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <SectionErrorBoundary section="Contact Analytics">
          <ScrapedContactAnalytics stats={stats} />
        </SectionErrorBoundary>
      )}

      {/* Filters and Search */}
      <SectionErrorBoundary section="Contact Filters">
        <ScrapedContactFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortBy(field);
            setSortDirection(direction);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sourceFiles={stats?.sourceFiles || []}
        />
      </SectionErrorBoundary>

      {/* Contacts Table / Cards + Detail Drawer + Empty State */}
      <SectionErrorBoundary section="Contact List">
        <ScrapedContactTable
          contacts={contacts}
          loading={loading}
          viewMode={viewMode}
          selectedContacts={selectedContacts}
          onSelectedContactsChange={setSelectedContacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
          onUpdateStatus={updateStatus}
          onUpdateNotes={updateNotes}
          onUpdateProjectTag={updateProjectTag}
          onUpdateAssignedTo={updateAssignedTo}
          onImport={() => setShowImportModal(true)}
          searchQuery={searchQuery}
          filters={filters}
        />
      </SectionErrorBoundary>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importContacts}
      />
    </div>
  );
}
