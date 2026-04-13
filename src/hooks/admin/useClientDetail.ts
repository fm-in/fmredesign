'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminToast } from '@/lib/admin/toast';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface ClientProfile {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  website?: string;
  description?: string;
  status: string;
  health: string;
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  additionalContacts: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  headquarters: {
    city: string;
    state: string;
    country: string;
  };
  contractDetails: {
    value: number;
    currency: string;
    startDate: string;
    endDate?: string;
  };
  accountManager: string;
  createdAt: string;
  // Auto-invoice fields
  autoInvoice?: boolean;
  autoInvoiceDay?: number;
  autoInvoiceSend?: boolean;
  autoInvoiceTemplate?: { description: string; sacCode?: string; quantity: number; rate: number; amount: number }[];
  autoInvoiceCurrency?: string;
  autoInvoiceTaxRate?: number;
  autoInvoiceNotes?: string;
  autoInvoiceTerms?: string;
}

/**
 * Transform flat API response from /api/clients into the nested ClientProfile shape.
 */
function transformToProfile(raw: Record<string, any>): ClientProfile {
  return {
    id: raw.id || '',
    name: raw.name || '',
    logo: raw.logoUrl || raw.logo || '',
    industry: raw.industry || 'other',
    website: raw.website || '',
    description: raw.description || '',
    status: raw.status || 'active',
    health: raw.health || 'good',
    primaryContact: raw.primaryContact || {
      name: raw.name || '',
      email: raw.email || '',
      phone: raw.phone || '',
      role: 'Primary Contact',
    },
    additionalContacts: raw.additionalContacts || [],
    headquarters: raw.headquarters || {
      city: raw.city || '',
      state: raw.state || '',
      country: raw.country || 'India',
    },
    contractDetails: raw.contractDetails || {
      value: parseFloat(raw.contractValue || raw.totalValue || '0'),
      currency: raw.currency || 'INR',
      startDate: raw.contractStartDate || '',
      endDate: raw.contractEndDate || undefined,
    },
    accountManager: raw.accountManager || 'Account Manager',
    createdAt: raw.createdAt || new Date().toISOString(),
    ...raw,
  };
}

export interface AssignedTeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
  hoursAllocated: number;
  isLead: boolean;
  assignmentId: string;
}

export interface AvailableTeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
}

export interface NewTeamAssignment {
  teamMemberId: string;
  hoursAllocated: number;
  isLead: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'ticket' | 'content';
  title: string;
  status?: string;
  priority?: string;
  platform?: string;
  date: string;
}

export interface ClientProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// ────────────────────────────────────────────────────────────
// Hook return type
// ────────────────────────────────────────────────────────────

export interface UseClientDetailReturn {
  // Core data
  clientProfile: ClientProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;

  // Team
  assignedTeamMembers: AssignedTeamMember[];
  availableTeamMembers: AvailableTeamMember[];
  showAddTeamForm: boolean;
  setShowAddTeamForm: (show: boolean) => void;
  newTeamAssignment: NewTeamAssignment;
  setNewTeamAssignment: React.Dispatch<React.SetStateAction<NewTeamAssignment>>;
  handleAddTeamMember: () => Promise<void>;
  handleRemoveTeamMember: (member: AssignedTeamMember) => Promise<void>;

  // Projects
  clientProjects: ClientProject[];
  projectsLoading: boolean;
  fetchClientProjects: () => Promise<void>;

  // Activity / Communication
  activityFeed: ActivityItem[];
  activityLoading: boolean;
  fetchActivityFeed: () => Promise<void>;
}

// ────────────────────────────────────────────────────────────
// Hook implementation
// ────────────────────────────────────────────────────────────

export function useClientDetail(clientId: string): UseClientDetailReturn {
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedTeamMembers, setAssignedTeamMembers] = useState<AssignedTeamMember[]>([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<AvailableTeamMember[]>([]);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newTeamAssignment, setNewTeamAssignment] = useState<NewTeamAssignment>({
    teamMemberId: '',
    hoursAllocated: 10,
    isLead: false,
  });
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // ── Load team assignments + available members ──
  const loadTeamData = useCallback(async () => {
    try {
      const [assignmentsRes, teamRes] = await Promise.all([
        fetch(`/api/team/assignments?clientId=${clientId}`),
        fetch('/api/team'),
      ]);

      const assignmentsResult = await assignmentsRes.json();
      const teamResult = await teamRes.json();

      const assignments = assignmentsResult.success ? assignmentsResult.data : [];
      const allTeamMembers = teamResult.success ? teamResult.data : [];

      // Build assigned list
      const assigned: AssignedTeamMember[] = [];
      for (const assignment of assignments) {
        const member = allTeamMembers.find((m: any) => m.id === assignment.teamMemberId);
        if (member) {
          assigned.push({
            id: member.id,
            name: member.name,
            role: member.role,
            status: member.status,
            hoursAllocated: assignment.hoursAllocated,
            isLead: assignment.isLead,
            assignmentId: assignment.id,
          });
        }
      }
      setAssignedTeamMembers(assigned);

      // Filter available (active + not already assigned)
      const assignedIds = new Set(assigned.map((m) => m.id));
      const available = allTeamMembers.filter(
        (member: any) => member.status === 'active' && !assignedIds.has(member.id)
      );
      setAvailableTeamMembers(available);
    } catch (err) {
      console.error('Error loading team data:', err);
    }
  }, [clientId]);

  // ── Refresh profile (re-fetch without full loading state) ──
  const refreshProfile = useCallback(async () => {
    if (!clientId) return;
    try {
      const response = await fetch(`/api/clients?id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientProfile(transformToProfile(data.data));
      }
    } catch (err) {
      console.error('Error refreshing client profile:', err);
    }
  }, [clientId]);

  // ── Initial data fetch (client profile + team) ──
  useEffect(() => {
    if (!clientId) return;

    const fetchClientData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/clients?id=${clientId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Client not found');
            return;
          }
          throw new Error('Failed to fetch client profile');
        }

        const data = await response.json();
        setClientProfile(transformToProfile(data.data));

        await loadTeamData();
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError('Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, loadTeamData]);

  // ── Fetch projects ──
  const fetchClientProjects = useCallback(async () => {
    if (!clientId) return;
    setProjectsLoading(true);
    try {
      const res = await fetch(`/api/projects?clientId=${clientId}`);
      const result = await res.json();
      if (result.success) {
        setClientProjects(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  }, [clientId]);

  // ── Fetch activity feed (tickets + content) ──
  const fetchActivityFeed = useCallback(async () => {
    if (!clientId) return;
    setActivityLoading(true);
    try {
      const [ticketsRes, contentRes] = await Promise.all([
        fetch(`/api/admin/support?clientId=${clientId}`).catch(() => null),
        fetch(`/api/content?clientId=${clientId}`).catch(() => null),
      ]);

      const items: ActivityItem[] = [];

      if (ticketsRes) {
        const ticketsResult = await ticketsRes.json();
        if (ticketsResult.success && ticketsResult.data) {
          ticketsResult.data.forEach((t: any) => {
            items.push({
              id: t.id,
              type: 'ticket',
              title: t.title,
              status: t.status,
              priority: t.priority,
              date: t.createdAt || t.created_at,
            });
          });
        }
      }

      if (contentRes) {
        const contentResult = await contentRes.json();
        if (contentResult.success && contentResult.data) {
          contentResult.data.forEach((c: any) => {
            items.push({
              id: c.id,
              type: 'content',
              title: c.title,
              status: c.status,
              platform: c.platform,
              date: c.scheduledDate || c.createdAt || c.created_at,
            });
          });
        }
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivityFeed(items);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
    } finally {
      setActivityLoading(false);
    }
  }, [clientId]);

  // ── Eagerly load projects & activity when profile loads ──
  useEffect(() => {
    if (clientProfile) {
      fetchClientProjects();
      fetchActivityFeed();
    }
  }, [clientProfile, fetchClientProjects, fetchActivityFeed]);

  // ── Team member handlers ──
  const handleAddTeamMember = useCallback(async () => {
    if (!newTeamAssignment.teamMemberId || !clientProfile) return;

    try {
      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMemberId: newTeamAssignment.teamMemberId,
          clientId,
          hoursAllocated: newTeamAssignment.hoursAllocated,
          isLead: newTeamAssignment.isLead,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to assign team member');
      }

      adminToast.success('Team member assigned successfully');

      await loadTeamData();
      setShowAddTeamForm(false);
      setNewTeamAssignment({
        teamMemberId: '',
        hoursAllocated: 10,
        isLead: false,
      });
    } catch (error) {
      console.error('Error adding team member:', error);
      adminToast.error('Failed to assign team member');
    }
  }, [clientId, clientProfile, newTeamAssignment, loadTeamData]);

  const handleRemoveTeamMember = useCallback(
    async (member: AssignedTeamMember) => {
      if (!clientProfile) return;

      try {
        const assignmentId = member.assignmentId;
        if (!assignmentId) {
          console.error('No assignment ID found for member:', member.id);
          return;
        }

        const res = await fetch(`/api/team/assignments?id=${assignmentId}`, {
          method: 'DELETE',
        });
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to remove team member');
        }

        adminToast.success('Team member removed from client');

        await loadTeamData();
      } catch (error) {
        console.error('Error removing team member:', error);
        adminToast.error('Failed to remove team member');
      }
    },
    [clientProfile, loadTeamData]
  );

  return {
    clientProfile,
    loading,
    error,
    refreshProfile,
    assignedTeamMembers,
    availableTeamMembers,
    showAddTeamForm,
    setShowAddTeamForm,
    newTeamAssignment,
    setNewTeamAssignment,
    handleAddTeamMember,
    handleRemoveTeamMember,
    clientProjects,
    projectsLoading,
    fetchClientProjects,
    activityFeed,
    activityLoading,
    fetchActivityFeed,
  };
}
