/**
 * FM Academy — Enrollments admin view.
 *
 * The buyer ledger. Each row shows: who bought, which program, how much,
 * status, and quick actions to mark paid / send invite / add notes.
 *
 * Phase 1 workflow:
 *   1. Buyer submits the public "Reserve seat" form → row created status='reserved'.
 *   2. Admin emails them the Razorpay payment link (manual or click "Share link").
 *   3. Buyer pays via Razorpay → admin sees confirmation in Razorpay dashboard.
 *   4. Admin marks row as 'paid' here. SQL trigger increments seats_taken.
 *   5. Admin clicks "Send invite" → confirmation email with delivery details
 *      (Phase 2 — for now, admin sends manually & toggles invite_sent_at).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, BarChart3, Users as UsersIcon } from 'lucide-react';
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
import { adminToast } from '@/lib/admin/toast';
import {
  ENROLLMENT_STATUS_LABELS,
  type Enrollment,
  type EnrollmentStatus,
} from '@/lib/admin/academy-types';

interface EnrollmentRow extends Enrollment {
  programTitle: string;
  programSlug: string;
  programFormat: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  revenueInr: number;
}

const STATUS_OPTIONS: EnrollmentStatus[] = ['reserved', 'paid', 'failed', 'refunded', 'cancelled'];

export default function EnrollmentsAdminPage() {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/academy/enrollments?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data as EnrollmentRow[]);
        setStats(json.stats as Stats);
      } else {
        adminToast.error(json.error || 'Failed to load enrollments');
      }
    } catch (e) {
      console.error(e);
      adminToast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (id: string, body: Partial<Enrollment>) => {
    try {
      const res = await fetch('/api/admin/academy/enrollments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (json.success) {
        adminToast.success('Updated');
        load();
      } else {
        adminToast.error(json.error || 'Update failed');
      }
    } catch {
      adminToast.error('Update failed');
    }
  }, [load]);

  const revenueLabel = useMemo(() => {
    if (!stats) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
      .format(stats.revenueInr);
  }, [stats]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/academy"
        className="inline-flex items-center gap-1 text-sm text-fm-neutral-500 hover:text-fm-neutral-900"
      >
        <ArrowLeft className="w-4 h-4" /> Academy
      </Link>
      <PageHeader
        title="Academy enrollments"
        icon={<BarChart3 className="w-6 h-6" />}
        description="Buyer ledger for workshops, cohorts and courses. Mark paid here once Razorpay confirms payment."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          variant="admin"
          icon={<UsersIcon className="w-4 h-4" />}
          title="Total enrollments"
          value={String(stats?.total ?? '—')}
        />
        <MetricCard
          variant="admin"
          icon={<UsersIcon className="w-4 h-4" />}
          title="Reserved"
          value={String(stats?.byStatus.reserved ?? 0)}
          subtitle="Awaiting payment"
        />
        <MetricCard
          variant="admin"
          icon={<CheckCircle2 className="w-4 h-4" />}
          title="Paid"
          value={String(stats?.byStatus.paid ?? 0)}
        />
        <MetricCard
          variant="admin"
          icon={<BarChart3 className="w-4 h-4" />}
          title="Revenue"
          value={revenueLabel}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Enrollments</CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | '')}
              className="text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{ENROLLMENT_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12" style={{ textAlign: 'center' }}>
              <p className="text-fm-neutral-500">No enrollments yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-fm-neutral-50 border-b border-fm-neutral-200">
                <tr className="text-left text-xs uppercase text-fm-neutral-500">
                  <th className="px-4 py-3 font-semibold">Buyer</th>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="px-4 py-3 font-semibold">Reserved</th>
                  <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-fm-neutral-100 hover:bg-fm-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fm-neutral-900">{r.buyerName}</div>
                      <div className="text-xs text-fm-neutral-500">
                        <a href={`mailto:${r.buyerEmail}`} className="hover:underline">{r.buyerEmail}</a>
                        {r.buyerPhone && <span> · {r.buyerPhone}</span>}
                      </div>
                      {r.buyerCompany && (
                        <div className="text-xs text-fm-neutral-400">{r.buyerCompany}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-fm-neutral-900">{r.programTitle}</div>
                      <div className="text-xs text-fm-neutral-500 capitalize">
                        {r.programFormat.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={r.status}
                        onChange={(e) => update(r.id, { status: e.target.value as EnrollmentStatus })}
                        className="text-xs"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{ENROLLMENT_STATUS_LABELS[s]}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                      {r.amountInr
                        ? new Intl.NumberFormat('en-IN', {
                            style: 'currency', currency: r.currency || 'INR', maximumFractionDigits: 0,
                          }).format(r.amountInr)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-fm-neutral-600">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3" style={{ textAlign: 'right' }}>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mark payment link as shared"
                          onClick={() => update(r.id, { paymentLinkSharedAt: new Date().toISOString() })}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        {r.status === 'paid' && !r.inviteSentAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Mark invite as sent"
                            onClick={() => update(r.id, { inviteSentAt: new Date().toISOString() })}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
