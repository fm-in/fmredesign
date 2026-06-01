/**
 * Admin FM Academy — Enrollments
 *
 *   GET  /api/admin/academy/enrollments              — list (filter ?status, ?programId)
 *   PUT  /api/admin/academy/enrollments              — update (status, notes,
 *                                                      payment fields, invite_sent_at)
 *
 * Phase 1 has no automatic Razorpay webhook — admin manually flips
 * enrollment status to 'paid' once Razorpay shows payment received.
 * Once flipped to 'paid', the SQL trigger increments seats_taken on the
 * linked program.
 *
 * RBAC:
 *   GET  — content.read
 *   PUT  — content.write (admin is recording a real-money transition)
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';
import {
  transformEnrollmentRow,
  type EnrollmentStatus,
} from '@/lib/admin/academy-types';

const ALLOWED_STATUSES: EnrollmentStatus[] = [
  'reserved', 'paid', 'failed', 'refunded', 'cancelled',
];

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get('status') as EnrollmentStatus | null;
  const programId = searchParams.get('programId');

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('enrollments')
    .select('*, programs!inner(title, slug, format)')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);
  if (programId) query = query.eq('program_id', programId);

  const { data, error } = await query;
  if (error) {
    console.error('Enrollments list error:', error);
    return ApiResponse.error('Failed to fetch enrollments');
  }

  // Flatten the joined program fields onto the row so the UI can render
  // "Buyer X reserved <program title>" without a second fetch.
  const enrollments = (data || []).map((row) => {
    const program = row.programs as Record<string, unknown> | null;
    const flat = transformEnrollmentRow(row);
    return {
      ...flat,
      programTitle: (program?.title as string) || '',
      programSlug: (program?.slug as string) || '',
      programFormat: (program?.format as string) || '',
    };
  });

  // Cheap summary stats so the admin page can show counts without a second
  // query — the list is small enough (< low thousands) that an in-process
  // aggregate is fine.
  const stats = {
    total: enrollments.length,
    byStatus: enrollments.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {}),
    revenueInr: enrollments
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + (e.amountInr || 0), 0),
  };

  return ApiResponse.success(enrollments, { stats });
}

// ─────────────────────────────────────────────────────────────────────────
// PUT — update enrollment (admin marks paid, adds notes, etc.)
// ─────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
  }

  const id = body.id as string;
  if (!id) return ApiResponse.validationError('id is required');

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    const next = body.status as EnrollmentStatus;
    if (!ALLOWED_STATUSES.includes(next)) {
      return ApiResponse.validationError(`Invalid status: ${next}`);
    }
    updates.status = next;
    if (next === 'paid' && !body.paidAt) {
      // Stamp paid_at automatically on the transition unless explicitly set.
      updates.paid_at = new Date().toISOString();
    }
  }

  if (body.notes !== undefined) updates.notes = (body.notes as string) || null;
  if (body.razorpayPaymentId !== undefined) updates.razorpay_payment_id = (body.razorpayPaymentId as string) || null;
  if (body.razorpayOrderId !== undefined) updates.razorpay_order_id = (body.razorpayOrderId as string) || null;
  if (body.amountInr !== undefined) updates.amount_inr = Number(body.amountInr) || 0;
  if (body.paymentLinkSharedAt !== undefined) {
    updates.payment_link_shared_at = (body.paymentLinkSharedAt as string) || null;
  }
  if (body.inviteSentAt !== undefined) {
    updates.invite_sent_at = (body.inviteSentAt as string) || null;
  }
  if (body.completedAt !== undefined) {
    updates.completed_at = (body.completedAt as string) || null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('enrollments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Enrollment update error:', error);
    return ApiResponse.error('Failed to update enrollment');
  }
  if (!data) return ApiResponse.notFound('Enrollment not found');

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'update',
    resource_type: 'enrollment',
    resource_id: id,
    details: {
      updatedFields: Object.keys(updates).filter((k) => k !== 'updated_at'),
      newStatus: updates.status,
    },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformEnrollmentRow(data));
}
