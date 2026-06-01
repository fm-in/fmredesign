/**
 * Team Workload Matrix — v1 (read-only)
 *
 * Aggregates `team_assignments` × `team_members` × `projects` × `clients`
 * client-side from existing APIs. No new server endpoint required for v1.
 *
 * Each row shows, per active team member: active assignment count, distinct
 * project count, distinct client count, total hours allocated, and an
 * inferred utilisation band relative to the member's declared capacity.
 *
 * Capacity bands:
 *   < 40%   → "Light"   (room for more work)
 *   40–80%  → "Healthy" (target zone)
 *   80–100% → "Full"
 *   > 100%  → "Overloaded" (red flag)
 *
 * Future iterations (out of scope here): time-period filter,
 * per-week heatmap, drill-down to per-project hours, soft re-balance
 * suggestions.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  DashboardCard as Card,
  CardContent,
  CardHeader,
  CardTitle,
  MetricCard,
} from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMember {
  id: string;
  name: string;
  role?: string;
  department?: string;
  status?: string;
  capacity?: number; // declared capacity hours / period
}

interface Assignment {
  id: string;
  teamMemberId: string;
  clientId?: string;
  projectId?: string;
  role?: string;
  hoursAllocated?: number;
  status?: string;
}

interface WorkloadRow {
  member: TeamMember;
  activeAssignments: number;
  distinctProjects: number;
  distinctClients: number;
  totalHours: number;
  utilisation: number | null; // 0..1+ if capacity is known
}

function utilisationBand(util: number | null): {
  label: string;
  className: string;
} {
  if (util === null) return { label: '—', className: 'text-fm-neutral-500' };
  const pct = util * 100;
  if (pct > 100) return { label: 'Overloaded', className: 'text-red-700 bg-red-50 border-red-200' };
  if (pct >= 80) return { label: 'Full', className: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (pct >= 40) return { label: 'Healthy', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  return { label: 'Light', className: 'text-sky-700 bg-sky-50 border-sky-200' };
}

export default function TeamWorkloadPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [membersRes, assignmentsRes] = await Promise.all([
          fetch('/api/team').then((r) => r.json()),
          fetch('/api/team/assignments').then((r) => r.json()),
        ]);
        if (cancelled) return;

        // /api/team returns { success, data: [...] } or { success, members }
        const memberList: TeamMember[] =
          membersRes.data ?? membersRes.members ?? [];
        const assignmentList: Assignment[] =
          assignmentsRes.data ?? assignmentsRes.assignments ?? [];

        setMembers(memberList);
        setAssignments(assignmentList);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: WorkloadRow[] = useMemo(() => {
    // Index assignments by team member, ignoring anything explicitly marked
    // "completed" / "cancelled" so the matrix reflects live workload.
    const liveStatuses = new Set(['active', 'in_progress', 'planned', undefined, null, '']);
    const byMember: Record<string, Assignment[]> = {};
    for (const a of assignments) {
      if (!liveStatuses.has(a.status as string)) continue;
      if (!a.teamMemberId) continue;
      (byMember[a.teamMemberId] ||= []).push(a);
    }

    return members
      .map((m): WorkloadRow => {
        const mine = byMember[m.id] || [];
        const distinctProjects = new Set(mine.map((a) => a.projectId).filter(Boolean)).size;
        const distinctClients = new Set(mine.map((a) => a.clientId).filter(Boolean)).size;
        const totalHours = mine.reduce((sum, a) => sum + (Number(a.hoursAllocated) || 0), 0);
        const cap = m.capacity && m.capacity > 0 ? m.capacity : null;
        return {
          member: m,
          activeAssignments: mine.length,
          distinctProjects,
          distinctClients,
          totalHours,
          utilisation: cap ? totalHours / cap : null,
        };
      })
      // Active members first; overloaded ones float to the top so they're
      // the first thing a manager sees on this page.
      .sort((a, b) => (b.utilisation ?? 0) - (a.utilisation ?? 0));
  }, [members, assignments]);

  const overloadedCount = rows.filter((r) => (r.utilisation ?? 0) > 1).length;
  const benchedCount = rows.filter((r) => r.activeAssignments === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/team"
          className="inline-flex items-center gap-1 text-sm text-fm-neutral-500 hover:text-fm-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Team
        </Link>
      </div>
      <PageHeader
        title="Team Workload"
        description="Active assignments, hours allocated and utilisation per team member. Read-only v1 — filters and per-week breakdown coming next."
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span>Failed to load workload: {error}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              variant="admin"
              icon={<Users className="w-4 h-4" />}
              title="Team members"
              value={String(rows.length)}
            />
            <MetricCard
              variant="admin"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Overloaded"
              value={String(overloadedCount)}
              subtitle={overloadedCount > 0 ? 'Re-balance needed' : 'None — healthy'}
            />
            <MetricCard
              variant="admin"
              icon={<Users className="w-4 h-4" />}
              title="On the bench"
              value={String(benchedCount)}
              subtitle="No active assignments"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workload matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-fm-neutral-50 border-b border-fm-neutral-200">
                  <tr className="text-left text-xs uppercase text-fm-neutral-500">
                    <th className="px-4 py-3 font-semibold">Team Member</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>
                      Assignments
                    </th>
                    <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>
                      Projects
                    </th>
                    <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>
                      Clients
                    </th>
                    <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>
                      Hours
                    </th>
                    <th className="px-4 py-3 font-semibold" style={{ textAlign: 'right' }}>
                      Capacity
                    </th>
                    <th className="px-4 py-3 font-semibold">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-fm-neutral-500"
                        style={{ textAlign: 'center' }}
                      >
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const band = utilisationBand(r.utilisation);
                      return (
                        <tr
                          key={r.member.id}
                          className="border-b border-fm-neutral-100 hover:bg-fm-neutral-50"
                        >
                          <td className="px-4 py-3 font-medium text-fm-neutral-900">
                            <Link
                              href={`/admin/team/${r.member.id}`}
                              className="hover:underline"
                            >
                              {r.member.name || '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-600">
                            {r.member.role || r.member.department || '—'}
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                            {r.activeAssignments}
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                            {r.distinctProjects}
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                            {r.distinctClients}
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-900" style={{ textAlign: 'right' }}>
                            {r.totalHours.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-fm-neutral-500" style={{ textAlign: 'right' }}>
                            {r.member.capacity ? r.member.capacity.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${band.className}`}
                            >
                              {band.label}
                              {r.utilisation !== null && (
                                <span className="ml-1 opacity-70">
                                  {Math.round(r.utilisation * 100)}%
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
