/**
 * ScrapedContactTable Component
 * Renders contacts in table or card view, with detail drawer and empty state.
 */

'use client';

import { useState } from 'react';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Eye,
  UserCheck,
  Users,
  Upload,
  ExternalLink,
  X,
  AlertTriangle,
  Share2,
  Briefcase,
} from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  ScrapedContact,
  ScrapedContactStatus,
  ScrapedContactFilters,
  ProjectTag,
} from '@/lib/admin/scraped-contact-types';
import { STATUS_OPTIONS, SOURCE_OPTIONS, PROJECT_TAG_OPTIONS, parseContactNotes } from '@/lib/admin/scraped-contact-types';
import { TeamMemberSelect } from '@/components/admin/TeamMemberSelect';

interface ScrapedContactTableProps {
  contacts: ScrapedContact[];
  loading: boolean;
  viewMode: 'table' | 'cards';
  selectedContacts: Set<string>;
  onSelectedContactsChange: (selected: Set<string>) => void;
  selectedContact: ScrapedContact | null;
  onSelectContact: (contact: ScrapedContact | null) => void;
  onUpdateStatus: (contactId: string, status: ScrapedContactStatus) => void;
  onUpdateNotes: (contactId: string, notes: string) => void;
  onUpdateProjectTag: (contactId: string, projectTag: ProjectTag) => void;
  onUpdateAssignedTo: (contactId: string, assignedTo: string) => void;
  onImport: () => void;
  searchQuery: string;
  filters: ScrapedContactFilters;
}

function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: ScrapedContactStatus;
  onChange: (status: ScrapedContactStatus) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ScrapedContactStatus)}
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

function getSourceLabel(platform: string): string {
  return SOURCE_OPTIONS.find((s) => s.value === platform)?.label || platform;
}

function PriorityBorder({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' | null }) {
  if (!priority) return null;
  const colors = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-green-400',
  };
  return <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors[priority]} rounded-l-xl`} />;
}

function PriorityBadge({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' | null }) {
  if (!priority) return null;
  const styles = {
    HIGH: 'bg-red-50 text-red-700 border-red-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles[priority]}`}>
      {priority === 'HIGH' && <AlertTriangle className="w-2.5 h-2.5" />}
      {priority}
    </span>
  );
}

function GapChips({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;
  const chipStyles: Record<string, string> = {
    'NO WEBSITE': 'bg-red-50 text-red-600 border-red-200',
    'NO SOCIAL MEDIA': 'bg-violet-50 text-violet-600 border-violet-200',
    'NO SOCIAL': 'bg-violet-50 text-violet-600 border-violet-200',
    'NO EMAIL': 'bg-amber-50 text-amber-600 border-amber-200',
  };
  return (
    <div className="flex flex-wrap gap-1">
      {gaps.map((gap) => (
        <span
          key={gap}
          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${chipStyles[gap] || 'bg-fm-neutral-50 text-fm-neutral-600 border-fm-neutral-200'}`}
        >
          {gap === 'NO WEBSITE' && <Globe className="w-2.5 h-2.5" />}
          {gap.includes('SOCIAL') && <Share2 className="w-2.5 h-2.5" />}
          {gap === 'NO EMAIL' && <Mail className="w-2.5 h-2.5" />}
          {gap}
        </span>
      ))}
    </div>
  );
}

function ProjectTagBadge({ tag }: { tag: ProjectTag }) {
  if (!tag) return null;
  const opt = PROJECT_TAG_OPTIONS.find((p) => p.value === tag);
  if (!opt) return null;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${opt.color}`}>
      {opt.label}
    </span>
  );
}

function AssignedBadge({ name }: { name: string }) {
  if (!name) return null;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Assigned to ${name}`}>
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[8px] font-bold">{initials}</span>
      {name.split(' ')[0]}
    </span>
  );
}

function ServiceTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-fm-magenta-50 text-fm-magenta-700 border border-fm-magenta-200"
        >
          <Briefcase className="w-2.5 h-2.5" />
          {tag}
        </span>
      ))}
      {tags.length > 3 && (
        <span className="text-[10px] text-fm-neutral-500">+{tags.length - 3}</span>
      )}
    </div>
  );
}

export function ScrapedContactTable({
  contacts,
  loading,
  viewMode,
  selectedContacts,
  onSelectedContactsChange,
  selectedContact,
  onSelectContact,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateProjectTag,
  onUpdateAssignedTo,
  onImport,
  searchQuery,
  filters,
}: ScrapedContactTableProps) {
  const [drawerNotes, setDrawerNotes] = useState('');

  // Empty state
  if (contacts.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Users className="w-6 h-6" />}
        title="No contacts found"
        description={
          searchQuery || Object.keys(filters).length > 1
            ? 'Try adjusting your search or filters'
            : 'Import your first batch of scraped contacts'
        }
        action={
          <DashboardButton variant="primary" size="sm" onClick={onImport}>
            <Upload className="w-4 h-4" />
            Import JSON
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
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
                      checked={selectedContacts.size === contacts.length && contacts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectedContactsChange(new Set(contacts.map((c) => c.id)));
                        } else {
                          onSelectedContactsChange(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Recommended Services
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-fm-neutral-200">
                {contacts.map((contact) => {
                  const parsed = parseContactNotes(contact.notes);
                  const borderColor = parsed.priority === 'HIGH' ? 'border-l-4 border-l-red-500' : parsed.priority === 'MEDIUM' ? 'border-l-4 border-l-amber-400' : parsed.priority === 'LOW' ? 'border-l-4 border-l-green-400' : '';
                  return (
                  <tr key={contact.id} className={`hover:bg-fm-neutral-50 ${borderColor}`}>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={(e) => {
                          const next = new Set(selectedContacts);
                          if (e.target.checked) next.add(contact.id);
                          else next.delete(contact.id);
                          onSelectedContactsChange(next);
                        }}
                        className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-fm-neutral-900 flex items-center gap-1.5 flex-wrap">
                            {contact.firstName} {contact.lastName}
                            <PriorityBadge priority={parsed.priority} />
                            <ProjectTagBadge tag={contact.projectTag} />
                            <AssignedBadge name={contact.assignedTo} />
                          </div>
                          {contact.companyName && (
                            <div className="text-xs text-fm-neutral-500">{contact.companyName}</div>
                          )}
                          {parsed.gaps.length > 0 && (
                            <div className="mt-1"><GapChips gaps={parsed.gaps} /></div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                      {contact.email ? (
                        <div className="text-sm text-fm-neutral-700 flex items-center">
                          <Mail className="w-3 h-3 mr-1 shrink-0" />
                          <span className="truncate max-w-[180px]">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-fm-neutral-400">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 whitespace-nowrap">
                      {contact.phone || contact.mobile ? (
                        <div className="text-sm text-fm-neutral-700 flex items-center">
                          <Phone className="w-3 h-3 mr-1 shrink-0" />
                          {contact.phone || contact.mobile}
                        </div>
                      ) : (
                        <span className="text-xs text-fm-neutral-400">—</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-4 py-3">
                      {contact.tags && contact.tags.length > 0 ? (
                        <ServiceTags tags={contact.tags} />
                      ) : (
                        <span className="text-xs text-fm-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusSelect
                        value={contact.status}
                        onChange={(status) => onUpdateStatus(contact.id, status)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <DashboardButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDrawerNotes(contact.notes || '');
                          onSelectContact(contact);
                        }}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </DashboardButton>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {contacts.map((contact) => {
            const parsed = parseContactNotes(contact.notes);
            const borderColor = parsed.priority === 'HIGH' ? 'border-l-4 border-l-red-500' : parsed.priority === 'MEDIUM' ? 'border-l-4 border-l-amber-400' : parsed.priority === 'LOW' ? 'border-l-4 border-l-green-400' : '';
            return (
            <div
              key={contact.id}
              className={`bg-white rounded-xl border border-fm-neutral-200 hover:shadow-lg transition-shadow ${borderColor}`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-fm-neutral-900 flex items-center gap-1.5 flex-wrap">
                      {contact.firstName} {contact.lastName}
                      <PriorityBadge priority={parsed.priority} />
                      <ProjectTagBadge tag={contact.projectTag} />
                      <AssignedBadge name={contact.assignedTo} />
                    </h3>
                    <p className="text-sm text-fm-neutral-600">{contact.companyName || 'No company'}</p>
                  </div>
                  <StatusBadge status={contact.sourcePlatform}>
                    {getSourceLabel(contact.sourcePlatform)}
                  </StatusBadge>
                </div>

                {/* Gaps */}
                {parsed.gaps.length > 0 && (
                  <div className="mb-3"><GapChips gaps={parsed.gaps} /></div>
                )}

                <div className="space-y-1.5 mb-3 text-sm">
                  {contact.email && (
                    <div className="text-fm-neutral-700 flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0 text-fm-neutral-400" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {(contact.phone || contact.mobile) && (
                    <div className="text-fm-neutral-700 flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-1.5 shrink-0 text-fm-neutral-400" />
                      {contact.phone || contact.mobile}
                    </div>
                  )}
                  {contact.country && (
                    <div className="text-fm-neutral-700 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0 text-fm-neutral-400" />
                      {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Service tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="mb-3"><ServiceTags tags={contact.tags} /></div>
                )}

                <div className="flex items-center justify-between">
                  <StatusSelect
                    value={contact.status}
                    onChange={(status) => onUpdateStatus(contact.id, status)}
                    className="text-xs font-medium rounded-full px-3 py-1 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                  />
                  <DashboardButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDrawerNotes(contact.notes || '');
                      onSelectContact(contact);
                    }}
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </DashboardButton>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedContact && (() => {
        const drawerParsed = parseContactNotes(selectedContact.notes);

        // Parse social links into structured array
        const socialEntries: { platform: string; url: string }[] = [];
        if (selectedContact.socialLinks) {
          for (const part of selectedContact.socialLinks.split(';')) {
            const trimmed = part.trim();
            const colonIdx = trimmed.indexOf(': ');
            if (colonIdx > 0) {
              socialEntries.push({ platform: trimmed.slice(0, colonIdx).trim(), url: trimmed.slice(colonIdx + 2).trim() });
            }
          }
        }

        const newnessStyles = {
          NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          GROWING: 'bg-blue-50 text-blue-700 border-blue-200',
          ESTABLISHED: 'bg-fm-neutral-100 text-fm-neutral-600 border-fm-neutral-200',
        };

        // Strip parsed fields from notes to get custom user notes
        const userNotes = (selectedContact.notes || '')
          .replace(/PRIORITY:\s*(HIGH|MEDIUM|LOW)\s*\|?\s*/g, '')
          .replace(/NEWNESS:\s*(NEW|GROWING|ESTABLISHED)\s*\|?\s*/g, '')
          .replace(/GAPS:\s*[^|]+\|?\s*/g, '')
          .replace(/RECOMMENDED SERVICES:\s*.+$/g, '')
          .replace(/\|\s*$/g, '')
          .trim();

        return (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" style={{ backdropFilter: 'blur(2px)' }} onClick={() => onSelectContact(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">

            {/* ── Header ────────────────────────────────────────── */}
            <div className="sticky top-0 bg-white border-b border-fm-neutral-200 px-5 py-4 flex items-start justify-between" style={{ zIndex: 10 }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-fm-neutral-900 truncate">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </h2>
                  <PriorityBadge priority={drawerParsed.priority} />
                  {drawerParsed.newness && (
                    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${newnessStyles[drawerParsed.newness]}`}>
                      {drawerParsed.newness === 'NEW' && <span className="mr-0.5">*</span>}
                      {drawerParsed.newness}
                    </span>
                  )}
                </div>
                {selectedContact.companyName && (
                  <p className="text-sm text-fm-neutral-600 mt-0.5 truncate">{selectedContact.companyName}</p>
                )}
                {selectedContact.category && (
                  <p className="text-xs text-fm-neutral-400 mt-0.5">{selectedContact.category}</p>
                )}
              </div>
              <button
                onClick={() => onSelectContact(null)}
                className="ml-3 p-1.5 rounded-lg text-fm-neutral-400 hover:text-fm-neutral-700 hover:bg-fm-neutral-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 pb-[env(safe-area-inset-bottom,24px)]">

              {/* ── Gaps & Services ──────────────────────────────── */}
              {(drawerParsed.gaps.length > 0 || drawerParsed.services.length > 0) && (
                <div className="space-y-2.5">
                  {drawerParsed.gaps.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block mb-2">Gaps Identified</span>
                      <GapChips gaps={drawerParsed.gaps} />
                    </div>
                  )}
                  {drawerParsed.services.length > 0 && (
                    <div className="bg-fm-magenta-50/50 border border-fm-magenta-200 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-fm-magenta-700 uppercase tracking-wider block mb-2">Recommended Services</span>
                      <div className="flex flex-wrap gap-1.5">
                        {drawerParsed.services.map((svc) => (
                          <span
                            key={svc}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-white text-fm-magenta-700 border border-fm-magenta-200 shadow-sm"
                          >
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Contact Info Card ───────────────────────────── */}
              <div className="bg-fm-neutral-50 rounded-xl border border-fm-neutral-200 divide-y divide-fm-neutral-200">
                {/* Email */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-fm-neutral-200 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-fm-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-fm-neutral-400 uppercase tracking-wider">Email</span>
                    {selectedContact.email ? (
                      <a href={`mailto:${selectedContact.email}`} className="block text-sm font-medium text-fm-magenta-600 truncate">
                        {selectedContact.email}
                      </a>
                    ) : (
                      <span className="block text-sm text-fm-neutral-300 italic">No email found</span>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-fm-neutral-200 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-fm-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-fm-neutral-400 uppercase tracking-wider">Phone</span>
                    {selectedContact.phone || selectedContact.mobile ? (
                      <a href={`tel:${selectedContact.phone || selectedContact.mobile}`} className="block text-sm font-medium text-fm-magenta-600">
                        {selectedContact.phone || selectedContact.mobile}
                      </a>
                    ) : (
                      <span className="block text-sm text-fm-neutral-300 italic">No phone found</span>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-fm-neutral-200 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-fm-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-fm-neutral-400 uppercase tracking-wider">Website</span>
                    {selectedContact.website ? (
                      <a
                        href={selectedContact.website.startsWith('http') ? selectedContact.website : `https://${selectedContact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-fm-magenta-600 truncate"
                      >
                        {selectedContact.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    ) : (
                      <span className="block text-sm text-fm-neutral-300 italic">No website</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-fm-neutral-200 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-fm-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-fm-neutral-400 uppercase tracking-wider">Location</span>
                    {selectedContact.city || selectedContact.state || selectedContact.country ? (
                      <>
                        <p className="text-sm font-medium text-fm-neutral-800">
                          {[selectedContact.city, selectedContact.state, selectedContact.country].filter(Boolean).join(', ')}
                        </p>
                        {selectedContact.addressFull && (
                          <p className="text-xs text-fm-neutral-500 mt-0.5 leading-relaxed">{selectedContact.addressFull}</p>
                        )}
                      </>
                    ) : (
                      <span className="block text-sm text-fm-neutral-300 italic">No location</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Social Links ─────────────────────────────────── */}
              {socialEntries.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-fm-neutral-500 uppercase tracking-wider block mb-2">Social Profiles</span>
                  <div className="flex flex-wrap gap-2">
                    {socialEntries.map(({ platform, url }) => (
                      <a
                        key={platform}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-fm-neutral-50 text-fm-neutral-700 border border-fm-neutral-200 hover:bg-fm-neutral-100 hover:border-fm-neutral-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Business Description ─────────────────────────── */}
              {selectedContact.businessDescription && (
                <div>
                  <span className="text-[10px] font-bold text-fm-neutral-500 uppercase tracking-wider block mb-1.5">About</span>
                  <p className="text-sm text-fm-neutral-700 leading-relaxed">{selectedContact.businessDescription}</p>
                </div>
              )}

              {/* ── Google Maps Link ─────────────────────────────── */}
              {selectedContact.profileUrl && (
                <a
                  href={selectedContact.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-fm-magenta-600 hover:text-fm-magenta-700 bg-fm-magenta-50 border border-fm-magenta-200 rounded-xl px-4 py-2.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  View on Google Maps
                </a>
              )}

              {/* ── Management Section ───────────────────────────── */}
              <div className="bg-fm-neutral-50 rounded-xl border border-fm-neutral-200 p-4 space-y-4">
                <span className="text-[10px] font-bold text-fm-neutral-500 uppercase tracking-wider block">Manage</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-fm-neutral-500 uppercase tracking-wider block mb-1">Status</label>
                    <StatusSelect
                      value={selectedContact.status}
                      onChange={(status) => onUpdateStatus(selectedContact.id, status)}
                      className="w-full text-xs font-medium rounded-lg px-3 py-2 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-fm-neutral-500 uppercase tracking-wider block mb-1">Project</label>
                    <select
                      value={selectedContact.projectTag || ''}
                      onChange={(e) => onUpdateProjectTag(selectedContact.id, e.target.value as ProjectTag)}
                      className="w-full text-xs font-medium rounded-lg px-3 py-2 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                    >
                      <option value="">Unassigned</option>
                      {PROJECT_TAG_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-fm-neutral-500 uppercase tracking-wider block mb-1">Assigned To</label>
                    <TeamMemberSelect
                      value={selectedContact.assignedTo || ''}
                      onChange={(name) => onUpdateAssignedTo(selectedContact.id, name)}
                      placeholder="Unassigned"
                      className="w-full text-xs font-medium rounded-lg px-3 py-2 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-fm-neutral-500 uppercase tracking-wider block mb-1">Source</label>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-fm-neutral-700 px-3 py-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {getSourceLabel(selectedContact.sourcePlatform)}
                    </div>
                  </div>
                </div>

                {selectedContact.sourceFile && (
                  <div className="flex items-center gap-2 text-xs text-fm-neutral-500 pt-1 border-t border-fm-neutral-200">
                    <span className="font-medium">Batch:</span>
                    <span className="font-mono text-fm-neutral-600 truncate">{selectedContact.sourceFile}</span>
                  </div>
                )}
              </div>

              {/* ── Notes ─────────────────────────────────────────── */}
              <div>
                <label className="text-[10px] font-bold text-fm-neutral-500 uppercase tracking-wider block mb-1.5">Internal Notes</label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Add your own notes about this contact..."
                  className="w-full min-h-[80px] text-sm border border-fm-neutral-200 rounded-xl p-3 text-fm-neutral-700 placeholder-fm-neutral-300 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent resize-y"
                />
                {drawerNotes !== (selectedContact.notes || '') && (
                  <DashboardButton
                    variant="primary"
                    size="sm"
                    onClick={() => onUpdateNotes(selectedContact.id, drawerNotes)}
                    className="mt-2"
                  >
                    Save Notes
                  </DashboardButton>
                )}
              </div>

              {/* ── Footer ────────────────────────────────────────── */}
              <p className="text-xs text-fm-neutral-400">
                Added {new Date(selectedContact.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedContact.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </>
        );
      })()}
    </>
  );
}
