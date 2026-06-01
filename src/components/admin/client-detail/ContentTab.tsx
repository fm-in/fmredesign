'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen } from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { ContentCalendar } from '@/components/content-calendar';
import type { CalendarContentItem } from '@/components/content-calendar';

interface ContentTabProps {
  clientId: string;
}

export function ContentTab({ clientId }: ContentTabProps) {
  const router = useRouter();
  const [calendarItems, setCalendarItems] = useState<CalendarContentItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const calendarRangeRef = useRef<{ start: string; end: string } | null>(null);

  const fetchCalendarContent = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        setCalendarLoading(true);
        const params = new URLSearchParams();
        params.set('clientId', clientId);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
        params.set('sortBy', 'scheduledDate');
        params.set('sortDirection', 'asc');

        const response = await fetch(`/api/content?${params}`);
        const result = await response.json();

        if (result.success) {
          const mapped: CalendarContentItem[] = (result.data || []).map(
            (c: any) => ({
              id: c.id,
              title: c.title || 'Untitled',
              scheduledDate: c.scheduledDate || '',
              status: c.status || 'draft',
              type: c.type || 'post',
              platform: c.platform || 'website',
              clientId: c.clientId,
              description: c.description,
            })
          );
          setCalendarItems(mapped);
        }
      } catch (error) {
        console.error('Error loading calendar content:', error);
      } finally {
        setCalendarLoading(false);
      }
    },
    [clientId]
  );

  const handleDateRangeChange = useCallback(
    (start: string, end: string) => {
      calendarRangeRef.current = { start, end };
      fetchCalendarContent(start, end);
    },
    [fetchCalendarContent]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider">
          Content Calendar
        </h3>
        <DashboardButton
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/admin/content?client=${clientId}`)}
        >
          View All Content
        </DashboardButton>
      </div>

      <ContentCalendar
        items={calendarItems}
        loading={calendarLoading}
        variant="admin"
        onDateRangeChange={handleDateRangeChange}
        onItemClick={(id) => router.push(`/admin/content/${id}`)}
      />

      {!calendarLoading && calendarItems.length === 0 && !calendarRangeRef.current && (
        <div style={{ textAlign: 'center' }} className="py-8 sm:py-12">
          <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 text-fm-neutral-400 mx-auto mb-4" />
          <h4 className="font-semibold text-fm-neutral-900 mb-2">No content items</h4>
          <p className="text-sm sm:text-base text-fm-neutral-600">
            Content calendar items for this client will appear here
          </p>
        </div>
      )}
    </div>
  );
}
