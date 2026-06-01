/**
 * My Work API — returns assignments, projects, and clients for the current user.
 * Auth: requireAdminAuth (any logged-in user can see their own work).
 * Reads team_member_id from fm-admin-user cookie.
 */

import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import { ApiResponse } from '@/lib/api-response';

const ADMIN_USER_COOKIE = 'fm-admin-user';

function getTeamMemberIdFromCookie(request: NextRequest): string | null {
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const userCookie = request.cookies.get(ADMIN_USER_COOKIE)?.value;
  if (!userCookie) return null;

  const dotIndex = userCookie.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = userCookie.slice(0, dotIndex);
  const signature = userCookie.slice(dotIndex + 1);

  try {
    const expectedSignature = createHmac('sha256', adminPassword)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.teamMemberId || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const teamMemberId = getTeamMemberIdFromCookie(request);

    if (!teamMemberId) {
      return ApiResponse.success(
        { assignments: [], projects: [], clients: [] },
        { message: 'No team member profile linked to this account.' },
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch assignments for this team member
    const { data: assignments, error: assignError } = await supabase
      .from('team_assignments')
      .select('*')
      .eq('team_member_id', teamMemberId)
      .order('created_at', { ascending: false });

    if (assignError) throw assignError;

    const assignmentList = assignments || [];

    // Get unique project and client IDs
    const projectIds = [...new Set(assignmentList.map(a => a.project_id).filter(Boolean))];
    const clientIds = [...new Set(assignmentList.map(a => a.client_id).filter(Boolean))];

    // Fetch projects
    let projects: Record<string, unknown>[] = [];
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, progress, client_id, created_at')
        .in('id', projectIds);
      projects = data || [];
    }

    // Fetch clients
    let clients: Record<string, unknown>[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, name, slug, status, health, industry')
        .in('id', clientIds);
      clients = data || [];
    }

    return ApiResponse.success({
      assignments: assignmentList.map(a => ({
        id: a.id,
        teamMemberId: a.team_member_id,
        clientId: a.client_id,
        projectId: a.project_id,
        role: a.role,
        hoursAllocated: a.hours_allocated,
        status: a.status,
        createdAt: a.created_at,
      })),
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        clientId: p.client_id,
        createdAt: p.created_at,
      })),
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        health: c.health,
        industry: c.industry,
      })),
    });
  } catch (error) {
    console.error('Error fetching my work:', error);
    return ApiResponse.error('Failed to fetch work data');
  }
}
