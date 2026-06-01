/**
 * FM Academy — admin list page.
 *
 * Shows every program (any status). Admin filters by status / format, can
 * jump into edit, or create a new one. A separate "Enrollments" button
 * surfaces the buyer ledger at /admin/academy/enrollments.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  Users as UsersIcon,
  BarChart3,
} from 'lucide-react';
import {
  DashboardCard as Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardButton as Button,
  MetricCard,
} from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select-native';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { adminToast } from '@/lib/admin/toast';
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  type Program,
  type ProgramFormat,
  type ProgramStatus,
  formatProgramPrice,
} from '@/lib/admin/academy-types';

export default function AcademyAdminPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | ''>('');
  const [formatFilter, setFormatFilter] = useState<ProgramFormat | ''>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (formatFilter) params.set('format', formatFilter);
      const res = await fetch(`/api/admin/academy/programs?${params}`);
      const json = await res.json();
      if (json.success) {
        setPrograms(json.data as Program[]);
      } else {
        adminToast.error(json.error || 'Failed to load programs');
      }
    } catch (err) {
      adminToast.error('Failed to load programs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, formatFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/academy/programs?id=${deleteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        adminToast.success('Program deleted');
        load();
      } else {
        adminToast.error(json.error || 'Failed to delete');
      }
    } catch {
      adminToast.error('Failed to delete program');
    } finally {
      setDeleteId(null);
    }
  }, [deleteId, load]);

  const stats = useMemo(() => {
    const total = programs.length;
    const open = programs.filter((p) => p.status === 'open').length;
    const draft = programs.filter((p) => p.status === 'draft').length;
    const seats = programs.reduce(
      (acc, p) => {
        acc.taken += p.seatsTaken || 0;
        acc.total += p.seatsTotal || 0;
        return acc;
      },
      { taken: 0, total: 0 },
    );
    return { total, open, draft, seats };
  }, [programs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="FM Academy"
        icon={<GraduationCap className="w-6 h-6" />}
        description="Workshops, cohorts, courses and 1:1s — sold and tracked here."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => router.push('/admin/academy/enrollments')}
            >
              <BarChart3 className="w-4 h-4" />
              Enrollments
            </Button>
            <Button
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => router.push('/admin/academy/new')}
            >
              <Plus className="w-4 h-4" />
              New Program
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          variant="admin"
          icon={<GraduationCap className="w-4 h-4" />}
          title="Total programs"
          value={String(stats.total)}
        />
        <MetricCard
          variant="admin"
          icon={<Calendar className="w-4 h-4" />}
          title="Open for enrollment"
          value={String(stats.open)}
          subtitle={`${stats.draft} draft`}
        />
        <MetricCard
          variant="admin"
          icon={<UsersIcon className="w-4 h-4" />}
          title="Seats taken"
          value={stats.seats.total > 0 ? `${stats.seats.taken} / ${stats.seats.total}` : String(stats.seats.taken)}
        />
        <MetricCard
          variant="admin"
          icon={<BarChart3 className="w-4 h-4" />}
          title="Fill rate"
          value={
            stats.seats.total > 0
              ? `${Math.round((stats.seats.taken / stats.seats.total) * 100)}%`
              : '—'
          }
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Programs</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | '')}
                className="text-sm"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as ProgramFormat | '')}
                className="text-sm"
              >
                <option value="">All formats</option>
                {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12" style={{ textAlign: 'center' }}>
              <GraduationCap className="w-10 h-10 text-fm-neutral-400 mx-auto mb-3" />
              <p className="text-fm-neutral-600 mb-4">
                No programs yet. Create your first workshop or cohort.
              </p>
              <Button variant="primary" onClick={() => router.push('/admin/academy/new')}>
                <Plus className="w-4 h-4 mr-1" />
                New Program
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-fm-neutral-50 border-b border-fm-neutral-200">
                <tr className="text-left text-xs uppercase text-fm-neutral-500">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>Price</th>
                  <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>Seats</th>
                  <th className="px-4 py-3 font-semibold">Starts</th>
                  <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => {
                  const price = formatProgramPrice(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-fm-neutral-100 hover:bg-fm-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-fm-neutral-900">{p.title}</div>
                        <div className="text-xs text-fm-neutral-500">/{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-fm-neutral-700">
                        {FORMAT_LABELS[p.format]}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status}>
                          {STATUS_LABELS[p.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                        <div>{price.current}</div>
                        {price.earlyBirdActive && (
                          <div className="text-xs text-fm-neutral-400 line-through">{price.original}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fm-neutral-700" style={{ textAlign: 'right' }}>
                        {p.seatsTotal ? `${p.seatsTaken}/${p.seatsTotal}` : p.seatsTaken}
                      </td>
                      <td className="px-4 py-3 text-fm-neutral-600">
                        {p.startsAt
                          ? new Date(p.startsAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3" style={{ textAlign: 'right' }}>
                        <div className="inline-flex items-center gap-1">
                          {p.status === 'open' && (
                            <Link
                              href={`/academy/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View public page"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          <Link href={`/admin/academy/${p.id}/edit`} title="Edit">
                            <Button variant="ghost" size="sm">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => setDeleteId(p.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete program"
        description="This permanently removes the program. If anyone has enrolled, you'll need to archive instead."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
