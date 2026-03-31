/**
 * useLeads Hook
 * Encapsulates all data fetching, filter/search/sort state, and lead actions
 * for the Lead Management Dashboard.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminToast } from '@/lib/admin/toast';
import type {
  LeadProfile,
  LeadStatus,
  LeadAnalytics,
  LeadDashboardStats,
  LeadFilters,
} from '@/lib/admin/lead-types';

export interface UseLeadsReturn {
  // Data
  leads: LeadProfile[];
  analytics: LeadAnalytics | null;
  dashboardStats: LeadDashboardStats | null;
  loading: boolean;

  // Selection
  selectedLeads: Set<string>;
  setSelectedLeads: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedLead: LeadProfile | null;
  setSelectedLead: React.Dispatch<React.SetStateAction<LeadProfile | null>>;

  // View
  viewMode: 'table' | 'cards';
  setViewMode: React.Dispatch<React.SetStateAction<'table' | 'cards'>>;

  // Sort
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  sortDirection: 'asc' | 'desc';
  setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;

  // Filters
  filters: LeadFilters;
  setFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  // Modal
  showAddLead: boolean;
  setShowAddLead: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions
  loadDashboardData: () => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateAssignedTo: (leadId: string, assignedTo: string) => Promise<void>;
  convertToClient: (leadId: string) => Promise<void>;
  exportLeads: () => void;

  // Formatters
  formatStatus: (status: LeadStatus) => string;
  formatPriority: (priority: string) => string;
}

export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<LeadProfile[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<LeadDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<LeadFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadProfile | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters.status) params.set('status', filters.status.join(','));
      if (filters.priority) params.set('priority', filters.priority.join(','));
      if (filters.source) params.set('source', filters.source.join(','));
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo.join(','));
      if (searchQuery) params.set('search', searchQuery);

      params.set('sortBy', sortBy);
      params.set('sortDirection', sortDirection);

      // Fetch leads
      const leadsResponse = await fetch(`/api/leads?${params}`);
      const leadsData = await leadsResponse.json();

      if (leadsData.success) {
        setLeads(leadsData.data);
      }

      // Fetch analytics
      const analyticsResponse = await fetch('/api/leads/analytics?type=full');
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/leads/analytics?type=dashboard');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setDashboardStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      adminToast.error('Failed to load lead data');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortDirection, searchQuery]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const updateLeadStatus = useCallback(
    async (leadId: string, status: LeadStatus) => {
      try {
        const response = await fetch('/api/leads', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: leadId,
            status,
          }),
        });

        if (response.ok) {
          await loadDashboardData();
        }
      } catch (error) {
        console.error('Error updating lead status:', error);
        adminToast.error('Failed to update lead status');
      }
    },
    [loadDashboardData]
  );

  const updateAssignedTo = useCallback(
    async (leadId: string, assignedTo: string) => {
      try {
        const response = await fetch('/api/leads', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: leadId, assignedTo }),
        });

        if (response.ok) {
          setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, assignedTo } : l))
          );
          if (selectedLead?.id === leadId) {
            setSelectedLead((prev) => prev ? { ...prev, assignedTo } : null);
          }
          adminToast.success('Assigned');
        }
      } catch (error) {
        console.error('Error assigning lead:', error);
        adminToast.error('Failed to assign');
      }
    },
    [selectedLead]
  );

  const convertToClient = useCallback(
    async (leadId: string) => {
      try {
        const response = await fetch('/api/leads/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leadId }),
        });

        if (response.ok) {
          await loadDashboardData();
          adminToast.success('Lead successfully converted to client!');
        }
      } catch (error) {
        console.error('Error converting lead:', error);
        adminToast.error('Failed to convert lead to client');
      }
    },
    [loadDashboardData]
  );

  const exportLeads = useCallback(() => {
    if (leads.length === 0) return;
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Company',
      'Project Type',
      'Budget',
      'Status',
      'Priority',
      'Score',
      'Created',
    ];
    const rows = leads.map((l) => [
      l.name,
      l.email,
      l.phone || '',
      l.company,
      l.projectType.replace(/_/g, ' '),
      l.budgetRange.replace(/_/g, ' '),
      l.status.replace(/_/g, ' '),
      l.priority,
      String(l.leadScore),
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads]);

  const formatStatus = useCallback((status: LeadStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  const formatPriority = useCallback((priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }, []);

  return {
    // Data
    leads,
    analytics,
    dashboardStats,
    loading,

    // Selection
    selectedLeads,
    setSelectedLeads,
    selectedLead,
    setSelectedLead,

    // View
    viewMode,
    setViewMode,

    // Sort
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,

    // Filters
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,

    // Modal
    showAddLead,
    setShowAddLead,

    // Actions
    loadDashboardData,
    updateLeadStatus,
    updateAssignedTo,
    convertToClient,
    exportLeads,

    // Formatters
    formatStatus,
    formatPriority,
  };
}
