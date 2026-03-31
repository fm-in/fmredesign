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
} from '@/lib/admin/scraped-contact-types';
import { STATUS_OPTIONS, SOURCE_OPTIONS, parseContactNotes } from '@/lib/admin/scraped-contact-types';

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
        'text-xs font-medium rounded-full px-2.5 py-0.5 border border-fm-neutral-200 bg-white text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent'
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
                          <div className="text-sm font-medium text-fm-neutral-900 flex items-center gap-1.5">
                            {contact.firstName} {contact.lastName}
                            <PriorityBadge priority={parsed.priority} />
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
                    <h3 className="text-base font-semibold text-fm-neutral-900 flex items-center gap-1.5">
                      {contact.firstName} {contact.lastName}
                      <PriorityBadge priority={parsed.priority} />
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
        return (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => onSelectContact(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-fm-neutral-900">Contact Details</h2>
                <DashboardButton variant="ghost" size="sm" onClick={() => onSelectContact(null)}>
                  <X className="w-5 h-5" />
                </DashboardButton>
              </div>

              <div className="space-y-5">
                {/* Name & Company + Priority */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-fm-neutral-900">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </h3>
                    <PriorityBadge priority={drawerParsed.priority} />
                  </div>
                  {selectedContact.companyName && (
                    <p className="text-sm text-fm-neutral-600">{selectedContact.companyName}</p>
                  )}
                  {selectedContact.category && (
                    <p className="text-xs text-fm-neutral-500 mt-0.5">{selectedContact.category}</p>
                  )}
                </div>

                {/* Gaps & Services Section */}
                {(drawerParsed.gaps.length > 0 || drawerParsed.services.length > 0) && (
                  <div className="space-y-3">
                    {drawerParsed.gaps.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-2">Gaps Identified</span>
                        <GapChips gaps={drawerParsed.gaps} />
                      </div>
                    )}
                    {drawerParsed.services.length > 0 && (
                      <div className="bg-fm-magenta-50 border border-fm-magenta-200 rounded-lg p-3">
                        <span className="text-xs font-bold text-fm-magenta-700 uppercase tracking-wider block mb-2">Recommended Services</span>
                        <div className="flex flex-wrap gap-1.5">
                          {drawerParsed.services.map((svc) => (
                            <span
                              key={svc}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white text-fm-magenta-700 border border-fm-magenta-200 shadow-sm"
                            >
                              <Briefcase className="w-3 h-3" />
                              {svc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {selectedContact.email && (
                    <div>
                      <span className="text-fm-neutral-500 block text-xs">Email</span>
                      <a href={`mailto:${selectedContact.email}`} className="text-fm-magenta-600 font-medium">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div>
                      <span className="text-fm-neutral-500 block text-xs">Phone</span>
                      <a href={`tel:${selectedContact.phone}`} className="text-fm-magenta-600 font-medium">
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}
                  {selectedContact.mobile && (
                    <div>
                      <span className="text-fm-neutral-500 block text-xs">Mobile</span>
                      <a href={`tel:${selectedContact.mobile}`} className="text-fm-magenta-600 font-medium">
                        {selectedContact.mobile}
                      </a>
                    </div>
                  )}
                  {selectedContact.website && (
                    <div>
                      <span className="text-fm-neutral-500 block text-xs">Website</span>
                      <a
                        href={selectedContact.website.startsWith('http') ? selectedContact.website : `https://${selectedContact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fm-magenta-600 font-medium flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{selectedContact.website.replace(/^https?:\/\//, '')}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Location */}
                {(selectedContact.city || selectedContact.state || selectedContact.country) && (
                  <div>
                    <span className="text-fm-neutral-500 text-xs block mb-1">Location</span>
                    <p className="text-sm text-fm-neutral-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {[selectedContact.city, selectedContact.state, selectedContact.country].filter(Boolean).join(', ')}
                    </p>
                    {selectedContact.addressFull && (
                      <p className="text-xs text-fm-neutral-500 mt-0.5">{selectedContact.addressFull}</p>
                    )}
                  </div>
                )}

                <hr className="border-fm-neutral-200" />

                {/* Business Info */}
                {selectedContact.businessDescription && (
                  <div>
                    <span className="text-fm-neutral-500 text-xs block mb-1">Business Description</span>
                    <p className="text-sm text-fm-neutral-700">{selectedContact.businessDescription}</p>
                  </div>
                )}

                {/* Social Links */}
                {selectedContact.socialLinks && (
                  <div>
                    <span className="text-fm-neutral-500 text-xs block mb-1">Social Links</span>
                    <p className="text-sm text-fm-neutral-700">{selectedContact.socialLinks}</p>
                  </div>
                )}

                {/* Profile URL */}
                {selectedContact.profileUrl && (
                  <div>
                    <a
                      href={selectedContact.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-fm-magenta-600 font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  </div>
                )}

                <hr className="border-fm-neutral-200" />

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-fm-neutral-500 block text-xs">Source</span>
                    <StatusBadge status={selectedContact.sourcePlatform}>
                      {getSourceLabel(selectedContact.sourcePlatform)}
                    </StatusBadge>
                  </div>
                  <div>
                    <span className="text-fm-neutral-500 block text-xs">Status</span>
                    <StatusSelect
                      value={selectedContact.status}
                      onChange={(status) => onUpdateStatus(selectedContact.id, status)}
                    />
                  </div>
                  {selectedContact.sourceFile && (
                    <div>
                      <span className="text-fm-neutral-500 block text-xs">Batch</span>
                      <p className="font-medium text-fm-neutral-900 text-xs">{selectedContact.sourceFile}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <span className="text-fm-neutral-500 text-xs block mb-1">Internal Notes</span>
                  <textarea
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    placeholder="Add notes about this contact..."
                    className="w-full min-h-[80px] text-sm border border-fm-neutral-200 rounded-lg p-2.5 text-fm-neutral-700 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent resize-y"
                  />
                  {drawerNotes !== (selectedContact.notes || '') && (
                    <DashboardButton
                      variant="secondary"
                      size="sm"
                      onClick={() => onUpdateNotes(selectedContact.id, drawerNotes)}
                      className="mt-2"
                    >
                      Save Notes
                    </DashboardButton>
                  )}
                </div>

                <div className="text-xs text-fm-neutral-500">
                  Created: {new Date(selectedContact.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </>
        );
      })()}
    </>
  );
}
