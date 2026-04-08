/**
 * LeadTable Component
 * Renders leads in either a table or card grid view, including the lead detail drawer.
 * Also handles the empty state when no leads match the current filters.
 */

'use client';

import {
  Mail,
  Phone,
  Globe,
  Calendar,
  Eye,
  Edit,
  UserCheck,
  Users,
  Plus,
} from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeadProfile, LeadStatus, LeadFilters as LeadFiltersType } from '@/lib/admin/lead-types';
import { TeamMemberSelect } from '@/components/admin/TeamMemberSelect';

interface LeadTableProps {
  leads: LeadProfile[];
  loading: boolean;
  viewMode: 'table' | 'cards';
  selectedLeads: Set<string>;
  onSelectedLeadsChange: (selected: Set<string>) => void;
  selectedLead: LeadProfile | null;
  onSelectLead: (lead: LeadProfile | null) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateAssignedTo: (leadId: string, assignedTo: string) => void;
  onConvertToClient: (leadId: string) => void;
  onAddLead: () => void;
  searchQuery: string;
  filters: LeadFiltersType;
  formatStatus: (status: LeadStatus) => string;
  formatPriority: (priority: string) => string;
}

/** Status options shared between table and card views */
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'discovery_scheduled', label: 'Discovery Scheduled' },
  { value: 'discovery_completed', label: 'Discovery Completed' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
];

/** Statuses eligible for conversion to client */
const CONVERTIBLE_STATUSES: LeadStatus[] = [
  'qualified',
  'discovery_completed',
  'proposal_sent',
];

function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      className={
        className ??
        'text-xs font-medium rounded-full px-3 py-1.5 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent min-h-[36px]'
      }
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function LeadTable({
  leads,
  loading,
  viewMode,
  selectedLeads,
  onSelectedLeadsChange,
  selectedLead,
  onSelectLead,
  onUpdateStatus,
  onUpdateAssignedTo,
  onConvertToClient,
  onAddLead,
  searchQuery,
  filters,
  formatStatus,
  formatPriority,
}: LeadTableProps) {
  // Empty state
  if (leads.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Users className="w-6 h-6" />}
        title="No leads found"
        description={
          searchQuery || Object.keys(filters).length > 0
            ? 'Try adjusting your search or filters'
            : 'Get started by capturing your first lead'
        }
        action={
          <DashboardButton variant="primary" size="sm" onClick={onAddLead}>
            <Plus className="w-4 h-4" />
            Add First Lead
          </DashboardButton>
        }
      />
    );
  }

  return (
    <>
      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-fm-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-fm-neutral-200">
              <thead className="bg-fm-neutral-50">
                <tr>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectedLeadsChange(new Set(leads.map((l) => l.id)));
                        } else {
                          onSelectedLeadsChange(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-fm-neutral-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-fm-neutral-50">
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedLeads);
                          if (e.target.checked) {
                            newSelected.add(lead.id);
                          } else {
                            newSelected.delete(lead.id);
                          }
                          onSelectedLeadsChange(newSelected);
                        }}
                        className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-fm-neutral-900">
                            {lead.name}
                          </div>
                          <div className="text-sm text-fm-neutral-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-fm-neutral-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-fm-neutral-900">{lead.company}</div>
                      {lead.website && (
                        <div className="text-sm text-fm-neutral-500 flex items-center">
                          <Globe className="w-3 h-3 mr-1" />
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      <div className="text-xs text-fm-neutral-500">{lead.companySize}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-fm-neutral-900 capitalize">
                        {lead.projectType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-fm-neutral-500 line-clamp-2">
                        {lead.projectDescription}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-fm-neutral-900">
                        {lead.budgetRange.replace(/_/g, ' ').replace(/k/g, 'K')}
                      </div>
                      <div className="text-sm text-fm-neutral-500 capitalize">
                        {lead.timeline.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.priority}>
                        {formatPriority(lead.priority)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusSelect
                        value={lead.status}
                        onChange={(status) => onUpdateStatus(lead.id, status)}
                      />
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-fm-neutral-900">
                          {lead.leadScore}
                        </div>
                        <div className="ml-2 w-12 bg-fm-neutral-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-fm-magenta-600"
                            style={{ width: `${lead.leadScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <DashboardButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectLead(lead)}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </DashboardButton>
                        <DashboardButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectLead(lead)}
                          title="Edit lead"
                        >
                          <Edit className="w-4 h-4" />
                        </DashboardButton>
                        {CONVERTIBLE_STATUSES.includes(lead.status) && (
                          <DashboardButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onConvertToClient(lead.id)}
                            title="Convert to client"
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </DashboardButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl border border-fm-neutral-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-fm-neutral-900">{lead.name}</h3>
                    <p className="text-sm text-fm-neutral-600">{lead.company}</p>
                    <p className="text-sm text-fm-neutral-500">{lead.email}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <StatusBadge status={lead.priority}>
                      {formatPriority(lead.priority)}
                    </StatusBadge>
                    <span className="text-sm font-medium text-fm-neutral-900">
                      {lead.leadScore}/100
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-fm-neutral-700 capitalize">
                    {lead.projectType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-fm-neutral-600 line-clamp-2 mt-1">
                    {lead.projectDescription}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-fm-neutral-600">
                    Budget:{' '}
                    <span className="font-medium">{lead.budgetRange.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-sm text-fm-neutral-600">
                    {lead.timeline.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <StatusSelect
                    value={lead.status}
                    onChange={(status) => onUpdateStatus(lead.id, status)}
                    className="text-xs font-medium rounded-full px-3 py-1 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                  />

                  <div className="flex items-center space-x-1">
                    <DashboardButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLead(lead)}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </DashboardButton>
                    <DashboardButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLead(lead)}
                      title="Edit lead"
                    >
                      <Edit className="w-4 h-4" />
                    </DashboardButton>
                    {CONVERTIBLE_STATUSES.includes(lead.status) && (
                      <DashboardButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onConvertToClient(lead.id)}
                        title="Convert to Client"
                      >
                        <UserCheck className="w-4 h-4 text-green-600" />
                      </DashboardButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => onSelectLead(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-fm-neutral-900">Lead Details</h2>
                <DashboardButton variant="ghost" size="sm" onClick={() => onSelectLead(null)}>
                  &times;
                </DashboardButton>
              </div>
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-fm-neutral-900">
                    {selectedLead.name}
                  </h3>
                  <p className="text-sm text-fm-neutral-600">{selectedLead.company}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-fm-neutral-500 block">Email</span>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="text-fm-magenta-600 font-medium"
                    >
                      {selectedLead.email}
                    </a>
                  </div>
                  {selectedLead.phone && (
                    <div>
                      <span className="text-fm-neutral-500 block">Phone</span>
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="text-fm-magenta-600 font-medium"
                      >
                        {selectedLead.phone}
                      </a>
                    </div>
                  )}
                  {selectedLead.website && (
                    <div>
                      <span className="text-fm-neutral-500 block">Website</span>
                      <a
                        href={selectedLead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fm-magenta-600 font-medium truncate block"
                      >
                        {selectedLead.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-fm-neutral-500 block">Company Size</span>
                    <p className="font-medium text-fm-neutral-900">{selectedLead.companySize}</p>
                  </div>
                </div>
                <hr className="border-fm-neutral-200" />
                <div className="space-y-3">
                  <div>
                    <span className="text-fm-neutral-500 text-sm block">Project Type</span>
                    <p className="font-medium text-fm-neutral-900 capitalize">
                      {selectedLead.projectType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 text-sm block">Description</span>
                    <p className="text-fm-neutral-700 text-sm">
                      {selectedLead.projectDescription}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-fm-neutral-500 text-sm block">Budget</span>
                      <p className="font-medium text-fm-neutral-900">
                        {selectedLead.budgetRange.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-fm-neutral-500 text-sm block">Timeline</span>
                      <p className="font-medium text-fm-neutral-900 capitalize">
                        {selectedLead.timeline.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 text-sm block">Primary Challenge</span>
                    <p className="text-fm-neutral-700 text-sm">
                      {selectedLead.primaryChallenge}
                    </p>
                  </div>
                </div>
                <hr className="border-fm-neutral-200" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-fm-neutral-500 block">Status</span>
                    <StatusBadge status={selectedLead.status}>
                      {formatStatus(selectedLead.status)}
                    </StatusBadge>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 block">Priority</span>
                    <StatusBadge status={selectedLead.priority}>
                      {formatPriority(selectedLead.priority)}
                    </StatusBadge>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 block">Score</span>
                    <p className="font-bold text-fm-neutral-900">{selectedLead.leadScore}/100</p>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 block text-xs mb-1">Assigned To</span>
                    <TeamMemberSelect
                      value={selectedLead.assignedTo || ''}
                      onChange={(name) => onUpdateAssignedTo(selectedLead.id, name)}
                      placeholder="Unassigned"
                      className="text-xs font-medium rounded-full px-3 py-1.5 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent min-h-[36px]"
                    />
                  </div>
                </div>
                <div className="text-xs text-fm-neutral-500">
                  Created: {new Date(selectedLead.createdAt).toLocaleString()}
                </div>
                {CONVERTIBLE_STATUSES.includes(selectedLead.status) && (
                  <DashboardButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onConvertToClient(selectedLead.id);
                      onSelectLead(null);
                    }}
                    className="w-full justify-center"
                  >
                    <UserCheck className="w-4 h-4" />
                    Convert to Client
                  </DashboardButton>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
