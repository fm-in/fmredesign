/**
 * Typed API Client — centralized fetch layer for all admin + client portal endpoints.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const clients = await api.clients.list();
 *   await api.clients.create({ name: 'Acme', ... });
 *
 * All methods handle JSON headers, error parsing, and consistent response types.
 * Mutations automatically show toast feedback via adminToast.
 */

import { adminToast } from '@/lib/admin/toast';
import type { Invoice, TeamMember, TeamAssignment, TeamMetrics } from '@/lib/admin/types';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Base fetch helpers
// ---------------------------------------------------------------------------

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  // Handle 204 No Content (delete operations)
  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok || (json.success !== undefined && !json.success)) {
    throw new ApiError(
      json.error || json.message || `Request failed (${res.status})`,
      res.status,
      json.code
    );
  }

  return json;
}

async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint);
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

/** Mutation wrapper that shows toast on success/error */
async function mutate<T>(
  fn: () => Promise<T>,
  opts?: { success?: string; error?: string; silent?: boolean }
): Promise<T> {
  try {
    const result = await fn();
    if (!opts?.silent && opts?.success) adminToast.success(opts.success);
    return result;
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'An unexpected error occurred';
    if (!opts?.silent) adminToast.error(opts?.error ?? message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Query param builder
// ---------------------------------------------------------------------------

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Resource types (lightweight — avoid importing heavy component-level types)
// ---------------------------------------------------------------------------

// Re-export types already defined elsewhere
export type { Invoice, TeamMember, TeamAssignment, TeamMetrics };

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  slug?: string;
  industry?: string;
  status: string;
  health?: string;
  logo?: string;
  account_manager?: string;
  services?: string[];
  created_at?: string;
  [key: string]: unknown; // allow extra fields from Supabase
}

export interface Project {
  id: string;
  client_id?: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  budget?: number;
  spent?: number;
  start_date?: string;
  end_date?: string;
  milestones?: unknown[];
  deliverables?: unknown[];
  tags?: string[];
  created_at?: string;
  [key: string]: unknown;
}

export interface ContentItem {
  id: string;
  client_id?: string;
  title: string;
  description?: string;
  type?: string;
  platform?: string;
  status: string;
  scheduled_date?: string;
  published_date?: string;
  author?: string;
  tags?: string[];
  client_feedback?: string;
  revision_notes?: string;
  approved_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  budget?: string;
  services?: string[];
  source?: string;
  status: string;
  score?: number;
  notes?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Proposal {
  id: string;
  client_id?: string;
  proposal_number: string;
  title: string;
  sections?: unknown[];
  total: number;
  status: string;
  valid_until?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SupportTicket {
  id: string;
  client_id?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  assigned_to?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AuthorizedUser {
  id: string;
  mobile_number: string;
  name: string;
  email?: string;
  role: string;
  permissions: string[];
  status: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DiscoverySession {
  id: string;
  client_name?: string;
  status?: string;
  [key: string]: unknown;
}

export interface TalentApplication {
  id: string;
  name: string;
  email: string;
  category?: string;
  skills?: string[];
  portfolio_url?: string;
  status: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Filter/sort params
// ---------------------------------------------------------------------------

export interface ListParams extends PaginationParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  status?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// API namespace
// ---------------------------------------------------------------------------

export const api = {
  // -----------------------------------------------------------------------
  // Auth
  // -----------------------------------------------------------------------
  auth: {
    loginPassword: (password: string) =>
      post<ApiResponse<{ user?: unknown }>>('/api/admin/auth/password', { password }),

    loginMobile: (mobileNumber: string) =>
      post<ApiResponse<{ user?: unknown }>>('/api/admin/auth/mobile', { mobileNumber }),

    session: () =>
      get<{ authenticated: boolean; user?: unknown }>('/api/admin/auth/session'),

    logout: () =>
      post<ApiResponse>('/api/admin/auth/logout', {}),
  },

  // -----------------------------------------------------------------------
  // Clients
  // -----------------------------------------------------------------------
  clients: {
    list: (params?: PaginationParams) =>
      get<ApiResponse<Client[]> & { pagination?: PaginationMeta }>(`/api/clients${qs({
        page: params?.page,
        pageSize: params?.pageSize,
      })}`),

    get: (id: string) =>
      get<ApiResponse<Client>>(`/api/clients${qs({ id })}`),

    create: (data: Partial<Client>) =>
      mutate(() => post<ApiResponse<Client>>('/api/clients', data), {
        success: 'Client created successfully',
      }),

    update: (data: Partial<Client> & { id: string }) =>
      mutate(() => put<ApiResponse<Client>>('/api/clients', data), {
        success: 'Client updated successfully',
      }),
  },

  // -----------------------------------------------------------------------
  // Projects
  // -----------------------------------------------------------------------
  projects: {
    list: (params?: ListParams) =>
      get<ApiResponse<Project[]> & { pagination?: PaginationMeta }>(`/api/projects${qs({
        sortBy: params?.sortBy ?? 'createdAt',
        sortDirection: params?.sortDirection ?? 'desc',
        page: params?.page,
        pageSize: params?.pageSize,
      })}`),

    get: (id: string) =>
      get<ApiResponse<Project>>(`/api/projects${qs({ id })}`),

    listByClient: (clientId: string) =>
      get<ApiResponse<Project[]>>(`/api/projects${qs({ clientId })}`),

    create: (data: Partial<Project>) =>
      mutate(() => post<ApiResponse<Project>>('/api/projects', data), {
        success: 'Project created successfully',
      }),

    update: (data: Partial<Project> & { id: string }) =>
      mutate(() => put<ApiResponse<Project>>('/api/projects', data), {
        success: 'Project updated successfully',
      }),

    delete: (id: string) =>
      mutate(() => del<ApiResponse>(`/api/projects${qs({ id })}`), {
        success: 'Project deleted',
      }),
  },

  // -----------------------------------------------------------------------
  // Content
  // -----------------------------------------------------------------------
  content: {
    list: (params?: ListParams & { clientId?: string }) =>
      get<ApiResponse<ContentItem[]> & { pagination?: PaginationMeta }>(`/api/content${qs({
        sortBy: params?.sortBy ?? 'scheduledDate',
        sortDirection: params?.sortDirection ?? 'asc',
        clientId: params?.clientId,
        page: params?.page,
        pageSize: params?.pageSize,
      })}`),

    get: (id: string) =>
      get<ApiResponse<ContentItem>>(`/api/content${qs({ id })}`),

    create: (data: Partial<ContentItem>) =>
      mutate(() => post<ApiResponse<ContentItem>>('/api/content', data), {
        success: 'Content created successfully',
      }),

    update: (data: Partial<ContentItem> & { id: string }) =>
      mutate(() => put<ApiResponse<ContentItem>>('/api/content', data), {
        success: 'Content updated successfully',
      }),

    delete: (id: string) =>
      mutate(() => del<ApiResponse>(`/api/content${qs({ id })}`), {
        success: 'Content deleted',
      }),
  },

  // -----------------------------------------------------------------------
  // Invoices
  // -----------------------------------------------------------------------
  invoices: {
    list: (params?: PaginationParams & { clientId?: string; status?: string; search?: string }) =>
      get<ApiResponse<Invoice[]> & { stats?: unknown; pagination?: PaginationMeta }>(`/api/invoices${qs({
        page: params?.page,
        pageSize: params?.pageSize,
        clientId: params?.clientId,
        status: params?.status,
        search: params?.search,
      })}`),

    get: (id: string) =>
      get<ApiResponse<Invoice>>(`/api/invoices${qs({ id })}`),

    create: (data: Partial<Invoice>) =>
      mutate(() => post<ApiResponse<Invoice>>('/api/invoices', data), {
        success: 'Invoice saved successfully',
      }),
  },

  // -----------------------------------------------------------------------
  // Proposals
  // -----------------------------------------------------------------------
  proposals: {
    list: () =>
      get<ApiResponse<Proposal[]>>('/api/proposals'),

    create: (data: Partial<Proposal>) =>
      mutate(() => post<ApiResponse<Proposal & { proposalNumber?: string }>>('/api/proposals', data), {
        success: 'Proposal saved successfully',
      }),
  },

  // -----------------------------------------------------------------------
  // Team
  // -----------------------------------------------------------------------
  team: {
    list: (params?: PaginationParams) =>
      get<ApiResponse<TeamMember[]> & { metrics?: TeamMetrics; pagination?: PaginationMeta }>(`/api/team${qs({
        page: params?.page,
        pageSize: params?.pageSize,
      })}`),

    get: (id: string) =>
      get<ApiResponse<TeamMember>>(`/api/team${qs({ id })}`),

    create: (data: Partial<TeamMember>) =>
      mutate(() => post<ApiResponse<TeamMember>>('/api/team', data), {
        success: 'Team member added successfully',
      }),

    update: (data: Partial<TeamMember> & { id: string }) =>
      mutate(() => put<ApiResponse<TeamMember>>('/api/team', data), {
        success: 'Team member updated successfully',
      }),

    // Assignments
    assignments: {
      list: (params?: { teamMemberId?: string; clientId?: string }) =>
        get<ApiResponse<TeamAssignment[]>>(`/api/team/assignments${qs(params ?? {})}`),

      create: (data: Partial<TeamAssignment>) =>
        mutate(() => post<ApiResponse<TeamAssignment>>('/api/team/assignments', data), {
          success: 'Assignment created',
        }),

      delete: (id: string) =>
        mutate(() => del<ApiResponse>(`/api/team/assignments${qs({ id })}`), {
          success: 'Assignment removed',
        }),
    },
  },

  // -----------------------------------------------------------------------
  // Leads
  // -----------------------------------------------------------------------
  leads: {
    list: (params?: ListParams) =>
      get<ApiResponse<Lead[]> & { pagination?: PaginationMeta }>(`/api/leads${qs({
        search: params?.search,
        status: params?.status,
        sortBy: params?.sortBy,
        sortDirection: params?.sortDirection,
        page: params?.page,
        pageSize: params?.pageSize,
      })}`),

    // POST /api/leads answers the same generic body for every submission
    // (created, merged, or saved via the pre-migration fallback) — never a Lead.
    create: (data: Partial<Lead>) =>
      mutate(() => post<ApiResponse<{ received: boolean }>>('/api/leads', data), {
        success: 'Lead added successfully',
      }),

    update: (data: { id: string; status: string }) =>
      mutate(() => put<ApiResponse>('/api/leads', data), { silent: true }),

    convert: (leadId: string) =>
      mutate(() => post<ApiResponse<Client>>('/api/leads/convert', { leadId }), {
        success: 'Lead converted to client',
      }),

    analytics: (type: 'full' | 'dashboard' = 'full') =>
      get<ApiResponse<unknown>>(`/api/leads/analytics${qs({ type })}`),
  },

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------
  discovery: {
    list: () =>
      get<ApiResponse<DiscoverySession[]>>('/api/discovery'),

    get: (sessionId: string) =>
      get<ApiResponse<DiscoverySession>>(`/api/discovery${qs({ sessionId })}`),

    listByClient: (clientId: string) =>
      get<ApiResponse<DiscoverySession[]>>(`/api/discovery${qs({ clientId })}`),

    create: (session: Partial<DiscoverySession>) =>
      mutate(() => post<ApiResponse<DiscoverySession>>('/api/discovery', { action: 'create', session }), {
        success: 'Discovery session created',
      }),

    update: (sessionId: string, updates: Partial<DiscoverySession>) =>
      mutate(() => put<ApiResponse<DiscoverySession>>('/api/discovery', { action: 'update', sessionId, updates }), {
        success: 'Discovery session updated',
      }),
  },

  // -----------------------------------------------------------------------
  // Talent (CreativeMinds)
  // -----------------------------------------------------------------------
  talent: {
    list: () =>
      get<ApiResponse<TalentApplication[]>>('/api/talent'),

    get: (slug: string) =>
      get<ApiResponse<TalentApplication>>(`/api/talent/${slug}`),

    apply: (data: Partial<TalentApplication>) =>
      mutate(() => post<ApiResponse<TalentApplication>>('/api/talent', data), {
        success: 'Application submitted successfully',
      }),
  },

  // -----------------------------------------------------------------------
  // Support (admin side)
  // -----------------------------------------------------------------------
  support: {
    list: (params?: { clientId?: string }) =>
      get<ApiResponse<SupportTicket[]>>(`/api/admin/support${qs(params ?? {})}`),

    update: (data: Partial<SupportTicket> & { id: string }) =>
      mutate(() => put<ApiResponse<SupportTicket>>('/api/admin/support', data), {
        success: 'Ticket updated',
      }),
  },

  // -----------------------------------------------------------------------
  // Users (authorized admin users)
  // -----------------------------------------------------------------------
  users: {
    list: () =>
      get<ApiResponse<AuthorizedUser[]>>('/api/admin/users'),

    create: (data: Partial<AuthorizedUser>) =>
      mutate(() => post<ApiResponse<AuthorizedUser>>('/api/admin/users', data), {
        success: 'User created successfully',
      }),

    update: (data: Partial<AuthorizedUser> & { id: string }) =>
      mutate(() => put<ApiResponse<AuthorizedUser>>('/api/admin/users', data), {
        success: 'User updated successfully',
      }),

    delete: (id: string) =>
      mutate(() => del<ApiResponse>(`/api/admin/users${qs({ id })}`), {
        success: 'User deleted',
      }),
  },

  // -----------------------------------------------------------------------
  // Audit
  // -----------------------------------------------------------------------
  audit: {
    list: (params?: { limit?: number; resource_type?: string; action?: string }) =>
      get<{ entries: AuditEntry[] }>(`/api/admin/audit${qs({
        limit: params?.limit ?? 50,
        resource_type: params?.resource_type,
        action: params?.action,
      })}`),
  },

  // -----------------------------------------------------------------------
  // Client Portal
  // -----------------------------------------------------------------------
  clientPortal: {
    login: (email: string, password: string) =>
      post<ApiResponse<{ redirectUrl: string }>>('/api/client-portal/login', { email, password }),

    logout: () =>
      post<ApiResponse>('/api/client-portal/logout', {}),

    profile: {
      get: (clientId: string) =>
        get<{ data: unknown }>(`/api/client-portal/${clientId}/profile`),

      update: (clientId: string, data: Record<string, unknown>) =>
        mutate(() => put<{ data: unknown }>(`/api/client-portal/${clientId}/profile`, data), {
          success: 'Profile updated',
        }),
    },

    projects: {
      list: (clientId: string, params?: { limit?: number }) =>
        get<{ data: unknown[] }>(`/api/client-portal/${clientId}/projects${qs({ limit: params?.limit ?? 50 })}`),
    },

    content: {
      list: (clientId: string, params?: { limit?: number }) =>
        get<{ data: unknown[] }>(`/api/client-portal/${clientId}/content${qs({ limit: params?.limit ?? 50 })}`),

      action: (clientId: string, data: { contentId: string; action: string; feedback?: string }) =>
        mutate(() => put<{ data: unknown }>(`/api/client-portal/${clientId}/content`, data), {
          success: data.action === 'approve' ? 'Content approved' : 'Revision requested',
        }),
    },

    contracts: {
      list: (clientId: string) =>
        get<{ data: unknown[] }>(`/api/client-portal/${clientId}/contracts`),

      action: (clientId: string, data: { contractId: string; action: string }) =>
        mutate(() => put<{ data: unknown }>(`/api/client-portal/${clientId}/contracts`, data), {
          success: `Contract ${data.action === 'accept' ? 'accepted' : data.action === 'reject' ? 'rejected' : 'edit requested'}`,
        }),
    },

    documents: {
      list: (clientId: string, params?: { category?: string }) =>
        get<{ data: unknown[] }>(`/api/client-portal/${clientId}/documents${qs(params ?? {})}`),
    },

    reports: {
      get: (clientId: string) =>
        get<{ data: unknown }>(`/api/client-portal/${clientId}/reports`),
    },

    activity: {
      list: (clientId: string) =>
        get<{ data: unknown[] }>(`/api/client-portal/${clientId}/activity`),
    },

    notifications: {
      list: (clientId: string, params?: { limit?: number }) =>
        get<{ data: unknown[]; unreadCount: number }>(`/api/client-portal/${clientId}/notifications${qs({ limit: params?.limit ?? 20 })}`),

      markRead: (clientId: string, ids?: string[]) =>
        put<unknown>(`/api/client-portal/${clientId}/notifications`, ids ? { ids } : { markAllRead: true }),
    },

    support: {
      list: (clientId: string) =>
        get<{ data: SupportTicket[] }>(`/api/client-portal/${clientId}/support/tickets`),

      create: (clientId: string, data: { title: string; description: string; priority: string; category: string }) =>
        mutate(() => post<{ data: SupportTicket }>(`/api/client-portal/${clientId}/support/tickets`, data), {
          success: 'Ticket submitted',
        }),
    },

    share: {
      create: (clientId: string, data: { resourceType: string; resourceId: string; label: string; expiresInDays?: number }) =>
        mutate(() => post<{ data: { url: string } }>(`/api/client-portal/${clientId}/share`, data), {
          success: 'Share link created',
        }),

      delete: (clientId: string, id: string) =>
        mutate(() => del<ApiResponse>(`/api/client-portal/${clientId}/share${qs({ id })}`), {
          success: 'Share link deleted',
        }),
    },
  },
};
