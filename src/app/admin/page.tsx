/**
 * FreakingMinds Admin Command Center
 * "Today" view — consolidated dashboard with urgency-driven sections.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Users,
  DollarSign,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { InvoiceUtils } from '@/lib/admin/types';
import { MetricCard, MetricCardSkeleton } from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { adminToast } from '@/lib/admin/toast';
import { useAdminAuth } from '@/lib/admin/auth';

import { TodaySection } from '@/components/admin/dashboard/TodaySection';
import { OverdueItems } from '@/components/admin/dashboard/OverdueItems';
import { PendingApprovals } from '@/components/admin/dashboard/PendingApprovals';
import { TodayContent } from '@/components/admin/dashboard/TodayContent';
import { ProjectPulse } from '@/components/admin/dashboard/ProjectPulse';

/* ── Types ── */
interface TodayData {
  stats: {
    totalClients: number;
    totalRevenue: number;
    activeProjects: number;
    scheduledContent: number;
  };
  overdue: {
    content: any[];
    projects: any[];
  };
  pendingApprovals: {
    talentApplications: any[];
    contentReview: any[];
  };
  todayContent: any[];
  activeProjects: any[];
  recentInvoices: any[];
}

/* ── Greeting helper ── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ── Quick Action type ── */
const quickActions = [
  { title: 'New Project', href: '/admin/projects/new', icon: Briefcase, color: 'bg-fm-magenta-50 text-fm-magenta-700', action: 'project', requiresFinance: false },
  { title: 'Schedule Content', href: '/admin/content/new', icon: Calendar, color: 'bg-violet-50 text-violet-700', action: 'content', requiresFinance: false },
  { title: 'Create Invoice', href: '/admin/invoice', icon: FileText, color: 'bg-sky-50 text-sky-700', action: 'invoice', requiresFinance: true },
  { title: 'Add Client', href: '/admin/clients', icon: Users, color: 'bg-emerald-50 text-emerald-700', action: 'client', requiresFinance: false },
];

/* ── Personal dashboard for non-admin users ── */
function PersonalDashboard({ userName }: { userName: string }) {
  const [myWork, setMyWork] = useState<{ assignments: any[]; projects: any[]; clients: any[] } | null>(null);
  const [myLeads, setMyLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [workRes, leadsRes] = await Promise.all([
          fetch('/api/admin/my-work'),
          fetch('/api/leads?sortBy=createdAt&sortDirection=desc'),
        ]);
        const workJson = await workRes.json();
        const leadsJson = await leadsRes.json();
        if (workJson.success) setMyWork(workJson.data);
        if (leadsJson.success) setMyLeads(leadsJson.data || []);
      } catch (e) {
        console.error('Error loading personal dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const newLeads = myLeads.filter((l: any) => l.status === 'new').length;
  const contactedLeads = myLeads.filter((l: any) => l.status === 'contacted').length;
  const activeProjects = myWork?.projects?.filter((p: any) => p.status === 'active' || p.status === 'in_progress') || [];

  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader
        title={`${getGreeting()}, ${userName.split(' ')[0]}`}
        description="Here's what's on your plate today."
      />

      {/* Personal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
        <MetricCard
          title="My Leads"
          value={myLeads.length}
          subtitle={`${newLeads} new, ${contactedLeads} contacted`}
          icon={<Users className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Active Projects"
          value={activeProjects.length}
          subtitle="Assigned to you"
          icon={<Briefcase className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Hot Leads"
          value={myLeads.filter((l: any) => l.priority === 'hot').length}
          subtitle="High priority"
          icon={<FileText className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="This Week"
          value={myLeads.filter((l: any) => {
            const d = new Date(l.createdAt);
            const now = new Date();
            return d >= new Date(now.setDate(now.getDate() - 7));
          }).length}
          subtitle="New leads this week"
          icon={<Calendar className="w-6 h-6" />}
          variant="admin"
        />
      </div>

      {/* Quick Actions for team */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Link
          href="/admin/leads"
          className="group flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-fm-neutral-200 bg-white p-3 sm:p-5 transition-all duration-200 hover:border-fm-magenta-200 hover:shadow-fm-sm"
        >
          <div className="p-3 rounded-xl bg-fm-magenta-50 text-fm-magenta-700 transition-transform duration-200 group-hover:scale-110">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-fm-neutral-700 group-hover:text-fm-neutral-900">My Leads</span>
        </Link>
        <Link
          href="/admin/my-work"
          className="group flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-fm-neutral-200 bg-white p-3 sm:p-5 transition-all duration-200 hover:border-fm-magenta-200 hover:shadow-fm-sm"
        >
          <div className="p-3 rounded-xl bg-violet-50 text-violet-700 transition-transform duration-200 group-hover:scale-110">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-fm-neutral-700 group-hover:text-fm-neutral-900">My Work</span>
        </Link>
        <Link
          href="/admin/content"
          className="group flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-fm-neutral-200 bg-white p-3 sm:p-5 transition-all duration-200 hover:border-fm-magenta-200 hover:shadow-fm-sm"
        >
          <div className="p-3 rounded-xl bg-sky-50 text-sky-700 transition-transform duration-200 group-hover:scale-110">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-fm-neutral-700 group-hover:text-fm-neutral-900">Content</span>
        </Link>
      </div>

      {/* My Leads List */}
      {myLeads.length > 0 && (
        <TodaySection title="My Leads" count={myLeads.length} viewAllHref="/admin/leads">
          <div className="divide-y divide-fm-neutral-100">
            {myLeads.slice(0, 8).map((lead: any) => (
              <Link
                key={lead.id}
                href="/admin/leads"
                className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-fm-neutral-50/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-fm-neutral-900">{lead.name || lead.company}</span>
                    <StatusBadge status={lead.priority}>{lead.priority}</StatusBadge>
                    {lead.leadSource === 'scraped' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">Scraped</span>
                    )}
                  </div>
                  <p className="text-xs text-fm-neutral-500 mt-0.5">
                    {lead.company && lead.company !== lead.name ? lead.company + ' · ' : ''}{lead.phone || lead.email || 'No contact'}
                  </p>
                </div>
                <StatusBadge status={lead.status}>{lead.status}</StatusBadge>
              </Link>
            ))}
          </div>
        </TodaySection>
      )}

      {/* My Projects */}
      {activeProjects.length > 0 && (
        <TodaySection title="My Projects" count={activeProjects.length} viewAllHref="/admin/my-work">
          <ProjectPulse projects={activeProjects} />
        </TodaySection>
      )}

      {/* Empty state */}
      {myLeads.length === 0 && activeProjects.length === 0 && (
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-8" style={{ textAlign: 'center' }}>
          <p className="text-fm-neutral-500 text-sm">No leads or projects assigned to you yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}

/* ── Main dashboard ── */
export default function AdminDashboard() {
  const router = useRouter();
  const { hasPermission, currentUser } = useAdminAuth();
  const canViewFinance = hasPermission('finance.read');
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const [data, setData] = useState<TodayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/today');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          adminToast.error('Failed to load dashboard data');
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        adminToast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isAdmin]);

  // Non-admin users get a personalized dashboard
  if (!isAdmin && !isLoading) {
    return <PersonalDashboard userName={currentUser?.name || 'Team'} />;
  }

  if (isLoading || !data) return <DashboardSkeleton />;

  const { stats, overdue, pendingApprovals, todayContent, activeProjects, recentInvoices } = data;
  const hasOverdue = overdue.content.length > 0 || overdue.projects.length > 0;
  const hasPending = pendingApprovals.talentApplications.length > 0 || pendingApprovals.contentReview.length > 0;

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <PageHeader
        title={getGreeting()}
        description="Your day at a glance — what needs attention right now."
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        <MetricCard
          title="Clients"
          value={stats.totalClients}
          subtitle="Active relationships"
          icon={<Users className="w-6 h-6" />}
          change={{ value: stats.totalClients, type: stats.totalClients > 0 ? 'increase' : 'neutral', period: 'total' }}
          variant="admin"
        />
        {canViewFinance && (
          <MetricCard
            title="Revenue"
            value={stats.totalRevenue}
            subtitle="Total collected"
            icon={<DollarSign className="w-6 h-6" />}
            formatter={(val) => InvoiceUtils.formatCurrency(Number(val))}
            variant="admin"
          />
        )}
        <MetricCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle="In progress"
          icon={<Briefcase className="w-6 h-6" />}
          change={{ value: stats.activeProjects, type: stats.activeProjects > 0 ? 'increase' : 'neutral', period: 'active now' }}
          variant="admin"
        />
        <MetricCard
          title="Today's Content"
          value={stats.scheduledContent}
          subtitle="Scheduled for today"
          icon={<Calendar className="w-6 h-6" />}
          variant="admin"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {quickActions.filter(a => !a.requiresFinance || canViewFinance).map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-fm-neutral-200 bg-white p-3 sm:p-5 transition-all duration-200 hover:border-fm-magenta-200 hover:shadow-fm-sm"
            >
              <div className={cn('p-3 rounded-xl transition-transform duration-200 group-hover:scale-110', action.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-fm-neutral-700 group-hover:text-fm-neutral-900">
                {action.title}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Overdue Items */}
      {hasOverdue && (
        <TodaySection
          title="Overdue"
          count={overdue.content.length + overdue.projects.length}
          variant="danger"
          viewAllHref="/admin/content"
        >
          <OverdueItems content={overdue.content} projects={overdue.projects} />
        </TodaySection>
      )}

      {/* Pending Approvals */}
      {hasPending && (
        <TodaySection
          title="Pending Approvals"
          count={pendingApprovals.contentReview.length + pendingApprovals.talentApplications.length}
          variant="warning"
          viewAllHref="/admin/content"
        >
          <PendingApprovals
            talentApplications={pendingApprovals.talentApplications}
            contentReview={pendingApprovals.contentReview}
          />
        </TodaySection>
      )}

      {/* Today's Content */}
      {todayContent.length > 0 && (
        <TodaySection title="Today's Content" count={todayContent.length} viewAllHref="/admin/content">
          <TodayContent items={todayContent} />
        </TodaySection>
      )}

      {/* Project Pulse */}
      {activeProjects.length > 0 && (
        <TodaySection title="Project Pulse" count={activeProjects.length} viewAllHref="/admin/projects">
          <ProjectPulse projects={activeProjects} />
        </TodaySection>
      )}

      {/* Recent Invoices */}
      {canViewFinance && recentInvoices.length > 0 && (
        <TodaySection title="Recent Invoices" viewAllHref="/admin/invoices">
          <div className="divide-y divide-fm-neutral-100">
            {recentInvoices.map((invoice: any) => (
              <Link
                key={invoice.id}
                href={`/admin/invoices`}
                className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-fm-neutral-50/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-medium text-fm-neutral-900">{invoice.invoiceNumber}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="text-xs text-fm-neutral-500 mt-0.5">
                    Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-fm-neutral-900 shrink-0 ml-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {InvoiceUtils.formatCurrency(Number(invoice.total) || 0)}
                </span>
              </Link>
            ))}
          </div>
        </TodaySection>
      )}
    </div>
  );
}
