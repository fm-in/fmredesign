'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { DashboardButton } from '@/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionErrorBoundary } from '@/components/admin/SectionErrorBoundary';
import { useClientDetail } from '@/hooks/admin/useClientDetail';
import { useAdminAuth } from '@/lib/admin/auth';
import { ArrowLeft, AlertCircle } from 'lucide-react';

// Lazy-load tab content — only active tab loads its bundle
const TabSkeleton = () => <Skeleton className="h-64 w-full rounded-xl" />;
const ClientPortalLink = dynamic(() => import('@/components/admin/ClientPortalLink'), { loading: TabSkeleton });
const ContractsTab = dynamic(() => import('@/components/admin/ContractsTab'), { loading: TabSkeleton });
const OverviewTab = dynamic(() => import('@/components/admin/client-detail/OverviewTab').then(m => ({ default: m.OverviewTab })), { loading: TabSkeleton });
const ProjectsTab = dynamic(() => import('@/components/admin/client-detail/ProjectsTab').then(m => ({ default: m.ProjectsTab })), { loading: TabSkeleton });
const TeamTab = dynamic(() => import('@/components/admin/client-detail/TeamTab').then(m => ({ default: m.TeamTab })), { loading: TabSkeleton });
const CommunicationTab = dynamic(() => import('@/components/admin/client-detail/CommunicationTab').then(m => ({ default: m.CommunicationTab })), { loading: TabSkeleton });
const ContentTab = dynamic(() => import('@/components/admin/client-detail/ContentTab').then(m => ({ default: m.ContentTab })), { loading: TabSkeleton });
const SupportTab = dynamic(() => import('@/components/admin/client-detail/SupportTab').then(m => ({ default: m.SupportTab })), { loading: TabSkeleton });
const DocumentsTab = dynamic(() => import('@/components/admin/client-detail/DocumentsTab').then(m => ({ default: m.DocumentsTab })), { loading: TabSkeleton });
const ContentStrategyTab = dynamic(() => import('@/components/admin/clients/ContentStrategyTab').then(m => ({ default: m.ContentStrategyTab })), { loading: TabSkeleton });
const GrowthEngine = dynamic(() => import('@/components/admin/GrowthEngine').then(m => ({ default: m.GrowthEngine })), { loading: TabSkeleton });
const CommunicationHub = dynamic(() => import('@/components/admin/CommunicationHub').then(m => ({ default: m.CommunicationHub })), { loading: TabSkeleton });
const CredentialsTab = dynamic(() => import('@/components/admin/client-detail/CredentialsTab').then(m => ({ default: m.CredentialsTab })), { loading: TabSkeleton });

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function getHealthColor(health: string): string {
  switch (health.toLowerCase()) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-fm-magenta-600';
    case 'warning':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-fm-neutral-600';
  }
}

// ────────────────────────────────────────────────────────────
// Page component
// ────────────────────────────────────────────────────────────

export default function AdminClientDetail() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const {
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
  } = useClientDetail(clientId);

  const { hasPermission } = useAdminAuth();
  const canViewFinance = hasPermission('finance.read');
  const [activeTab, setActiveTab] = useState('overview');

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── Error / not found state ──
  if (error || !clientProfile) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title={error || 'Client not found'}
          action={
            <DashboardButton onClick={() => router.back()} variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </DashboardButton>
          }
        />
      </div>
    );
  }

  const additionalEmails = (clientProfile.additionalContacts || []).map((c) => c.email);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={clientProfile.name}
        description={`${clientProfile.industry} • Managed by ${clientProfile.accountManager}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <DashboardButton onClick={() => router.back()} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </DashboardButton>
            <StatusBadge status={clientProfile.status} />
            <div className={`flex items-center ${getHealthColor(clientProfile.health)}`}>
              <div className="h-2 w-2 rounded-full bg-current mr-2"></div>
              <span className="text-sm font-medium capitalize">{clientProfile.health}</span>
            </div>
          </div>
        }
      />

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Scrollable tab bar with fade hints on mobile */}
          <div className="relative">
            <TabsList className="w-full sm:w-fit overflow-x-auto scrollbar-none flex-nowrap">
              {/* Core Work */}
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
              {/* Strategy & Analytics */}
              <TabsTrigger value="strategy" className="text-xs sm:text-sm">Strategy</TabsTrigger>
              <TabsTrigger value="growth" className="text-xs sm:text-sm">Growth</TabsTrigger>
              {/* Business */}
              {canViewFinance && <TabsTrigger value="contracts" className="text-xs sm:text-sm">Contracts</TabsTrigger>}
              <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
              <TabsTrigger value="credentials" className="text-xs sm:text-sm">Credentials</TabsTrigger>
              {/* People & Communication */}
              <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs sm:text-sm">Messages</TabsTrigger>
              <TabsTrigger value="communication" className="text-xs sm:text-sm">Activity</TabsTrigger>
              <TabsTrigger value="support" className="text-xs sm:text-sm">Support</TabsTrigger>
              {/* Admin */}
              <TabsTrigger value="portal" className="text-xs sm:text-sm">Portal</TabsTrigger>
            </TabsList>
            {/* Right fade hint for scrollable tabs on mobile */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
          </div>

          <TabsContent value="overview" className="space-y-6">
            <SectionErrorBoundary section="Overview">
              <OverviewTab clientProfile={clientProfile} onProfileUpdate={refreshProfile} onTabChange={setActiveTab} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="portal" className="space-y-6">
            <SectionErrorBoundary section="Client Portal">
              <ClientPortalLink
                clientId={clientProfile.id}
                clientName={clientProfile.name}
                primaryEmail={clientProfile.primaryContact.email}
                additionalEmails={additionalEmails}
              />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent
            value="projects"
            className="space-y-6"
            onFocusCapture={() => {
              if (clientProjects.length === 0 && !projectsLoading) fetchClientProjects();
            }}
          >
            <SectionErrorBoundary section="Projects">
              <ProjectsTab
                projects={clientProjects}
                loading={projectsLoading}
                onFetchProjects={fetchClientProjects}
              />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <SectionErrorBoundary section="Content">
              <ContentTab clientId={clientId} />
            </SectionErrorBoundary>
          </TabsContent>

          {canViewFinance && (
            <TabsContent value="contracts" className="space-y-6">
              <SectionErrorBoundary section="Contracts">
                <ContractsTab clientId={clientId} clientName={clientProfile?.name} />
              </SectionErrorBoundary>
            </TabsContent>
          )}

          <TabsContent value="documents" className="space-y-6">
            <SectionErrorBoundary section="Documents">
              <DocumentsTab clientId={clientId} clientName={clientProfile?.name} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            <SectionErrorBoundary section="Credentials">
              <CredentialsTab clientId={clientId} clientName={clientProfile?.name} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <SectionErrorBoundary section="Team">
              <TeamTab
                assignedTeamMembers={assignedTeamMembers}
                availableTeamMembers={availableTeamMembers}
                showAddTeamForm={showAddTeamForm}
                setShowAddTeamForm={setShowAddTeamForm}
                newTeamAssignment={newTeamAssignment}
                setNewTeamAssignment={setNewTeamAssignment}
                onAddTeamMember={handleAddTeamMember}
                onRemoveTeamMember={handleRemoveTeamMember}
              />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <SectionErrorBoundary section="Communication">
              <CommunicationTab activityFeed={activityFeed} loading={activityLoading} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SectionErrorBoundary section="Support">
              <SupportTab clientId={clientId} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <SectionErrorBoundary section="Content Strategy">
              <ContentStrategyTab clientId={clientId} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <SectionErrorBoundary section="Growth Engine">
              <GrowthEngine clientId={clientId} clientName={clientProfile.name} />
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <SectionErrorBoundary section="Communication Hub">
              <CommunicationHub clientId={clientId} />
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
