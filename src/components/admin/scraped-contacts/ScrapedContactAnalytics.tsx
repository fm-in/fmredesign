/**
 * ScrapedContactAnalytics Component
 * Renders the dashboard stats cards for scraped contacts.
 */

'use client';

import { Users, Mail, Phone, UserCheck, AlertTriangle, Globe, Share2 } from 'lucide-react';
import { MetricCard } from '@/design-system';
import type { ScrapedContactStats } from '@/lib/admin/scraped-contact-types';

interface ScrapedContactAnalyticsProps {
  stats: ScrapedContactStats;
}

export function ScrapedContactAnalytics({ stats }: ScrapedContactAnalyticsProps) {
  const emailPct = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;
  const phonePct = stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0;
  const converted = stats.byStatus?.converted || 0;
  const highPriority = stats.priorityHigh || 0;
  const noWebsite = stats.noWebsite || 0;
  const noSocial = stats.noSocial || 0;

  return (
    <div className="space-y-4">
      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Contacts"
          value={stats.total}
          subtitle={`From ${Object.keys(stats.bySource).length} source(s)`}
          icon={<Users className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="With Email"
          value={stats.withEmail}
          subtitle={`${emailPct}% of total`}
          icon={<Mail className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="With Phone"
          value={stats.withPhone}
          subtitle={`${phonePct}% of total`}
          icon={<Phone className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Converted"
          value={converted}
          subtitle="Converted to leads"
          icon={<UserCheck className="w-6 h-6" />}
          variant="admin"
        />
      </div>

      {/* Opportunity stats — only show if we have enrichment data */}
      {(highPriority > 0 || noWebsite > 0 || noSocial > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{highPriority}</p>
              <p className="text-xs text-red-600 font-medium">High Priority Leads</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{noWebsite}</p>
              <p className="text-xs text-amber-600 font-medium">No Website</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700">{noSocial}</p>
              <p className="text-xs text-violet-600 font-medium">No Social Media</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
