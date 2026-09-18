'use client';

import { DashboardButton } from '@/design-system';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatIst, type SalesMeeting } from '@/lib/sales/api-types';

const STATUS_TEXT: Record<SalesMeeting['status'], string> = {
  booked: 'Booked',
  cancelled: 'Cancelled',
  completed: 'Held',
  no_show: 'No-show',
};

export function LeadMeetings({
  meetings,
  onUpdate,
}: {
  meetings: SalesMeeting[];
  onUpdate: (meetingId: string, status: 'completed' | 'no_show') => Promise<boolean>;
}) {
  if (meetings.length === 0) {
    return <p className="text-sm text-fm-neutral-500">No calls booked. The booking link is in every follow-up email.</p>;
  }

  return (
    <ul className="space-y-3">
      {meetings.map((meeting) => {
        const started = new Date(meeting.startsAt).getTime() <= Date.now();
        return (
          <li key={meeting.id} className="rounded-lg border border-fm-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-fm-neutral-900">{formatIst(meeting.startsAt)} IST</p>
              <StatusBadge status={meeting.status}>{STATUS_TEXT[meeting.status]}</StatusBadge>
            </div>
            {meeting.title && <p className="mt-1 text-sm text-fm-neutral-600">{meeting.title}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {meeting.meetingUrl && meeting.status === 'booked' && (
                <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-fm-magenta-700 hover:underline">
                  Join call
                </a>
              )}
              {meeting.status === 'booked' && started && (
                <>
                  <DashboardButton variant="primary" size="sm" onClick={() => onUpdate(meeting.id, 'completed')}>
                    Mark as held
                  </DashboardButton>
                  <DashboardButton variant="ghost" size="sm" onClick={() => onUpdate(meeting.id, 'no_show')}>
                    No-show
                  </DashboardButton>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
