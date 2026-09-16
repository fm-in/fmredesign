'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CardContent, CardHeader, CardTitle, DashboardButton, DashboardCard } from '@/design-system';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadDetailHeader } from '@/components/admin/sales/LeadDetailHeader';
import { LeadMeetings } from '@/components/admin/sales/LeadMeetings';
import { LeadTimeline } from '@/components/admin/sales/LeadTimeline';
import { SalesTaskList } from '@/components/admin/sales/SalesTaskList';
import { useLeadDetail } from '@/hooks/admin/useLeadDetail';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const detail = useLeadDetail(params.id);
  // Converting creates a client record, so it takes a second, deliberate click.
  const [confirmingConvert, setConfirmingConvert] = useState(false);

  if (detail.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <EmptyState
        title="Lead not found"
        description={detail.error ?? 'It may have been deleted, or it belongs to someone else.'}
        action={
          <Link href="/admin/leads" className="text-fm-magenta-700 hover:underline">
            Back to leads
          </Link>
        }
      />
    );
  }

  const { lead, activities, tasks, meetings, owners, suppressed, sequences, permissions } = detail.data;
  const latestBrief = activities.find((activity) => activity.type === 'ai_brief');

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link href="/admin/leads" className="text-sm text-fm-neutral-600 hover:text-fm-magenta-700">
        ← All leads
      </Link>

      <LeadDetailHeader
        lead={lead}
        owners={owners}
        canAssign={permissions.canAssign}
        userId={permissions.userId}
        suppressed={suppressed}
        sequences={sequences}
        onStageChange={detail.changeStage}
        onOwnerChange={detail.changeOwner}
        onStopSequence={detail.stopSequence}
        onStartSequence={detail.startSequence}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          {latestBrief?.body && (
            <DashboardCard variant="admin">
              <CardHeader>
                <CardTitle>{latestBrief.subject ?? 'Lead brief'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-fm-neutral-700">{latestBrief.body}</p>
              </CardContent>
            </DashboardCard>
          )}

          <DashboardCard variant="admin">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTimeline activities={activities} onAddNote={detail.addNote} />
            </CardContent>
          </DashboardCard>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <DashboardCard variant="admin">
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesTaskList tasks={tasks} phoneE164={lead.phoneE164} onComplete={detail.completeTask} />
            </CardContent>
          </DashboardCard>

          <DashboardCard variant="admin">
            <CardHeader>
              <CardTitle>Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadMeetings meetings={meetings} onUpdate={detail.updateMeeting} />
            </CardContent>
          </DashboardCard>

          <DashboardCard variant="admin">
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <Link href={`/admin/discovery/new?leadId=${encodeURIComponent(lead.id)}`} className="text-sm font-medium text-fm-magenta-700 hover:underline">
                Start a discovery session
              </Link>
              {lead.clientId ? (
                <Link href={`/admin/clients/${lead.clientId}`} className="text-sm font-medium text-fm-magenta-700 hover:underline">
                  Open client record
                </Link>
              ) : confirmingConvert ? (
                <div className="flex flex-wrap items-center gap-2">
                  <DashboardButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setConfirmingConvert(false);
                      detail.convertToClient();
                    }}
                  >
                    Confirm: convert to client
                  </DashboardButton>
                  <DashboardButton variant="ghost" size="sm" onClick={() => setConfirmingConvert(false)}>
                    Cancel
                  </DashboardButton>
                </div>
              ) : (
                <DashboardButton variant="primary" size="sm" onClick={() => setConfirmingConvert(true)}>
                  Convert to client
                </DashboardButton>
              )}
            </CardContent>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
