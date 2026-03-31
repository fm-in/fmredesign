/**
 * useScrapedContacts Hook
 * Encapsulates data fetching, filter/search/sort state, and actions
 * for the Scraped Contacts Dashboard.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminToast } from '@/lib/admin/toast';
import type {
  ScrapedContact,
  ScrapedContactStatus,
  ScrapedContactFilters,
  ScrapedContactStats,
  ProjectTag,
} from '@/lib/admin/scraped-contact-types';

export interface UseScrapedContactsReturn {
  contacts: ScrapedContact[];
  stats: ScrapedContactStats | null;
  loading: boolean;

  selectedContacts: Set<string>;
  setSelectedContacts: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedContact: ScrapedContact | null;
  setSelectedContact: React.Dispatch<React.SetStateAction<ScrapedContact | null>>;

  viewMode: 'table' | 'cards';
  setViewMode: React.Dispatch<React.SetStateAction<'table' | 'cards'>>;

  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  sortDirection: 'asc' | 'desc';
  setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;

  filters: ScrapedContactFilters;
  setFilters: React.Dispatch<React.SetStateAction<ScrapedContactFilters>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  showImportModal: boolean;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;

  loadData: () => Promise<void>;
  updateStatus: (contactId: string, status: ScrapedContactStatus) => Promise<void>;
  updateNotes: (contactId: string, notes: string) => Promise<void>;
  updateProjectTag: (contactId: string, projectTag: ProjectTag) => Promise<void>;
  updateAssignedTo: (contactId: string, assignedTo: string) => Promise<void>;
  bulkAssign: (ids: string[], assignedTo: string) => Promise<void>;
  bulkSetProjectTag: (ids: string[], projectTag: ProjectTag) => Promise<void>;
  deleteContacts: (ids: string[]) => Promise<void>;
  importContacts: (contacts: Record<string, unknown>[], sourcePlatform: string, sourceFile?: string) => Promise<{ inserted: number; skipped: number }>;
  exportContacts: () => void;
}

export function useScrapedContacts(): UseScrapedContactsReturn {
  const [contacts, setContacts] = useState<ScrapedContact[]>([]);
  const [stats, setStats] = useState<ScrapedContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<ScrapedContact | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<ScrapedContactFilters>({ hasContact: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.sourcePlatform?.length) params.set('sourcePlatform', filters.sourcePlatform.join(','));
      if (filters.sourceFile) params.set('sourceFile', filters.sourceFile);
      if (filters.projectTag) params.set('projectTag', filters.projectTag);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters.country) params.set('country', filters.country);
      if (filters.hasContact === false) params.set('hasContact', 'false');
      if (searchQuery) params.set('search', searchQuery);

      params.set('sortBy', sortBy);
      params.set('sortDirection', sortDirection);

      const response = await fetch(`/api/admin/scraped-contacts?${params}`);
      const json = await response.json();

      if (json.success) {
        setContacts(json.data);
        setStats(json.stats);
      }
    } catch (error) {
      console.error('Error loading scraped contacts:', error);
      adminToast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortDirection, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatus = useCallback(
    async (contactId: string, status: ScrapedContactStatus) => {
      try {
        const response = await fetch('/api/admin/scraped-contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contactId, status }),
        });

        if (response.ok) {
          // Optimistic update
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, status } : c))
          );
          if (selectedContact?.id === contactId) {
            setSelectedContact((prev) => prev ? { ...prev, status } : null);
          }
        }
      } catch (error) {
        console.error('Error updating contact status:', error);
        adminToast.error('Failed to update status');
      }
    },
    [selectedContact]
  );

  const updateNotes = useCallback(
    async (contactId: string, notes: string) => {
      try {
        const response = await fetch('/api/admin/scraped-contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contactId, notes }),
        });

        if (response.ok) {
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, notes } : c))
          );
          if (selectedContact?.id === contactId) {
            setSelectedContact((prev) => prev ? { ...prev, notes } : null);
          }
        }
      } catch (error) {
        console.error('Error updating notes:', error);
        adminToast.error('Failed to update notes');
      }
    },
    [selectedContact]
  );

  const updateProjectTag = useCallback(
    async (contactId: string, projectTag: ProjectTag) => {
      try {
        const response = await fetch('/api/admin/scraped-contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contactId, projectTag }),
        });

        if (response.ok) {
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, projectTag } : c))
          );
          if (selectedContact?.id === contactId) {
            setSelectedContact((prev) => prev ? { ...prev, projectTag } : null);
          }
          adminToast.success('Project updated');
        }
      } catch (error) {
        console.error('Error updating project tag:', error);
        adminToast.error('Failed to update project');
      }
    },
    [selectedContact]
  );

  const updateAssignedTo = useCallback(
    async (contactId: string, assignedTo: string) => {
      try {
        const response = await fetch('/api/admin/scraped-contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contactId, assignedTo }),
        });

        if (response.ok) {
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, assignedTo } : c))
          );
          if (selectedContact?.id === contactId) {
            setSelectedContact((prev) => prev ? { ...prev, assignedTo } : null);
          }
          adminToast.success('Assigned');
        }
      } catch (error) {
        console.error('Error assigning contact:', error);
        adminToast.error('Failed to assign');
      }
    },
    [selectedContact]
  );

  const bulkAssign = useCallback(
    async (ids: string[], assignedTo: string) => {
      try {
        await Promise.all(
          ids.map((id) =>
            fetch('/api/admin/scraped-contacts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, assignedTo }),
            })
          )
        );
        setContacts((prev) =>
          prev.map((c) => (ids.includes(c.id) ? { ...c, assignedTo } : c))
        );
        setSelectedContacts(new Set());
        adminToast.success(`Assigned ${ids.length} contact(s) to ${assignedTo}`);
      } catch (error) {
        console.error('Error bulk assigning:', error);
        adminToast.error('Failed to bulk assign');
      }
    },
    []
  );

  const bulkSetProjectTag = useCallback(
    async (ids: string[], projectTag: ProjectTag) => {
      try {
        await Promise.all(
          ids.map((id) =>
            fetch('/api/admin/scraped-contacts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, projectTag }),
            })
          )
        );
        setContacts((prev) =>
          prev.map((c) => (ids.includes(c.id) ? { ...c, projectTag } : c))
        );
        setSelectedContacts(new Set());
        const label = projectTag || 'Unassigned';
        adminToast.success(`Tagged ${ids.length} contact(s) as ${label}`);
      } catch (error) {
        console.error('Error bulk tagging:', error);
        adminToast.error('Failed to bulk tag');
      }
    },
    []
  );

  const deleteContacts = useCallback(
    async (ids: string[]) => {
      try {
        const response = await fetch(`/api/admin/scraped-contacts?ids=${ids.join(',')}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
          setSelectedContacts(new Set());
          if (selectedContact && ids.includes(selectedContact.id)) {
            setSelectedContact(null);
          }
          adminToast.success(`Deleted ${ids.length} contact(s)`);
        }
      } catch (error) {
        console.error('Error deleting contacts:', error);
        adminToast.error('Failed to delete contacts');
      }
    },
    [selectedContact]
  );

  const importContacts = useCallback(
    async (contactsData: Record<string, unknown>[], sourcePlatform: string, sourceFile?: string) => {
      try {
        const response = await fetch('/api/admin/scraped-contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: contactsData, sourcePlatform, sourceFile }),
        });

        const json = await response.json();
        if (json.success) {
          adminToast.success(json.message);
          await loadData();
          return { inserted: json.data.inserted, skipped: json.data.skipped };
        }
        throw new Error(json.error);
      } catch (error) {
        console.error('Error importing contacts:', error);
        adminToast.error('Failed to import contacts');
        return { inserted: 0, skipped: 0 };
      }
    },
    [loadData]
  );

  const exportContacts = useCallback(() => {
    if (contacts.length === 0) return;

    // Import parseContactNotes inline to avoid circular deps
    const parseNotes = (notes: string) => {
      const r: { priority: string; gaps: string; services: string } = { priority: '', gaps: '', services: '' };
      if (!notes) return r;
      const pm = notes.match(/PRIORITY:\s*(HIGH|MEDIUM|LOW)/);
      if (pm) r.priority = pm[1];
      const gm = notes.match(/GAPS:\s*([^|]+)/);
      if (gm) r.gaps = gm[1].trim();
      const sm = notes.match(/RECOMMENDED SERVICES:\s*(.+?)(?:\||$)/);
      if (sm) r.services = sm[1].trim();
      return r;
    };

    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Company',
      'Category', 'City', 'State', 'Country', 'Website', 'Social Links',
      'Google Maps', 'Source', 'Status', 'Project', 'Assigned To',
      'Priority', 'Gaps', 'Recommended Services', 'Tags', 'Notes', 'Created',
    ];
    const rows = contacts.map((c) => {
      const parsed = parseNotes(c.notes);
      return [
        c.firstName,
        c.lastName,
        c.email || '',
        c.phone || '',
        c.mobile || '',
        c.companyName || '',
        c.category || '',
        c.city || '',
        c.state || '',
        c.country || '',
        c.website || '',
        c.socialLinks || '',
        c.profileUrl || '',
        c.sourcePlatform,
        c.status,
        c.projectTag || '',
        c.assignedTo || '',
        parsed.priority,
        parsed.gaps,
        parsed.services,
        (c.tags || []).join('; '),
        c.notes.replace(/PRIORITY:.*?\|/g, '').replace(/GAPS:.*?\|/g, '').replace(/RECOMMENDED SERVICES:.*$/g, '').trim(),
        new Date(c.createdAt).toLocaleDateString(),
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [contacts]);

  return {
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
    loadData,
    updateStatus,
    updateNotes,
    updateProjectTag,
    updateAssignedTo,
    bulkAssign,
    bulkSetProjectTag,
    deleteContacts,
    importContacts,
    exportContacts,
  };
}
