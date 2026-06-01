/**
 * Admin FM Academy — Programs CRUD
 *
 *   GET    /api/admin/academy/programs           — list all (filter ?status, ?format)
 *   GET    /api/admin/academy/programs?id=X      — fetch one
 *   POST   /api/admin/academy/programs           — create
 *   PUT    /api/admin/academy/programs           — update (body.id required)
 *   DELETE /api/admin/academy/programs?id=X      — delete
 *
 * RBAC:
 *   GET    — content.read  (programs are public content, every admin role
 *            can see them; the public list is filtered by status='open')
 *   POST   — content.write
 *   PUT    — content.write
 *   DELETE — content.delete
 *
 * All writes log to the audit trail. Slug is required and must be unique;
 * we surface the conflict cleanly instead of leaking the DB error.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';
import {
  generateProgramId,
  transformProgramRow,
  type ProgramFormat,
  type ProgramStatus,
} from '@/lib/admin/academy-types';

// Slugify input (idempotent — admin form should pre-suggest one, but if
// they leave it blank we derive from the title).
function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const statusFilter = searchParams.get('status') as ProgramStatus | null;
  const formatFilter = searchParams.get('format') as ProgramFormat | null;

  const supabase = getSupabaseAdmin();

  if (id) {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return ApiResponse.notFound('Program not found');
    return ApiResponse.success(transformProgramRow(data));
  }

  let query = supabase
    .from('programs')
    .select('*')
    .order('starts_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);
  if (formatFilter) query = query.eq('format', formatFilter);

  const { data, error } = await query;
  if (error) {
    console.error('Programs list error:', error);
    return ApiResponse.error('Failed to fetch programs');
  }

  return ApiResponse.success((data || []).map(transformProgramRow));
}

// ─────────────────────────────────────────────────────────────────────────
// POST — create
// ─────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
  }

  const title = (body.title as string)?.trim();
  const format = body.format as ProgramFormat;
  if (!title) return ApiResponse.validationError('title is required');
  if (!format) return ApiResponse.validationError('format is required');

  const slug = ((body.slug as string)?.trim() || slugify(title));
  if (!slug) return ApiResponse.validationError('slug could not be derived from title');

  const id = generateProgramId();
  const supabase = getSupabaseAdmin();

  // Slug uniqueness pre-check — surfacing a clear 409 beats a raw 500.
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    return ApiResponse.error(`Slug "${slug}" is already in use`, 409);
  }

  const record = {
    id,
    slug,
    title,
    format,
    status: (body.status as ProgramStatus) || 'draft',
    short_description: (body.shortDescription as string) || null,
    long_description: (body.longDescription as string) || null,
    cover_image_url: (body.coverImageUrl as string) || null,
    price_inr: Number(body.priceInr) || 0,
    early_bird_price_inr: body.earlyBirdPriceInr != null ? Number(body.earlyBirdPriceInr) : null,
    early_bird_until: (body.earlyBirdUntil as string) || null,
    currency: (body.currency as string) || 'INR',
    starts_at: (body.startsAt as string) || null,
    ends_at: (body.endsAt as string) || null,
    schedule: body.schedule ?? null,
    seats_total: body.seatsTotal != null ? Number(body.seatsTotal) : null,
    outcomes: body.outcomes ?? null,
    syllabus: body.syllabus ?? null,
    faq: body.faq ?? null,
    testimonials: body.testimonials ?? null,
    delivery_zoom_url: (body.deliveryZoomUrl as string) || null,
    delivery_whatsapp_url: (body.deliveryWhatsappUrl as string) || null,
    delivery_notion_url: (body.deliveryNotionUrl as string) || null,
    instructor_name: (body.instructorName as string) || null,
    instructor_bio: (body.instructorBio as string) || null,
    instructor_image_url: (body.instructorImageUrl as string) || null,
    payment_link_url: (body.paymentLinkUrl as string) || null,
    created_by: auth.user.id,
  };

  const { data, error } = await supabase
    .from('programs')
    .insert(record)
    .select()
    .single();
  if (error) {
    console.error('Program create error:', error);
    return ApiResponse.error('Failed to create program');
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'create',
    resource_type: 'program',
    resource_id: id,
    details: { title, format, slug },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformProgramRow(data));
}

// ─────────────────────────────────────────────────────────────────────────
// PUT — update
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

  // Slug change: re-check uniqueness against other rows.
  if (body.slug) {
    const supabase = getSupabaseAdmin();
    const { data: clash } = await supabase
      .from('programs')
      .select('id')
      .eq('slug', body.slug as string)
      .neq('id', id)
      .maybeSingle();
    if (clash) return ApiResponse.error(`Slug "${body.slug}" is already in use`, 409);
  }

  // Whitelist of updatable columns. We never let `seats_taken` be set from
  // the API — that's owned by the enrollment trigger.
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    slug: 'slug',
    title: 'title',
    format: 'format',
    status: 'status',
    shortDescription: 'short_description',
    longDescription: 'long_description',
    coverImageUrl: 'cover_image_url',
    priceInr: 'price_inr',
    earlyBirdPriceInr: 'early_bird_price_inr',
    earlyBirdUntil: 'early_bird_until',
    currency: 'currency',
    startsAt: 'starts_at',
    endsAt: 'ends_at',
    schedule: 'schedule',
    seatsTotal: 'seats_total',
    outcomes: 'outcomes',
    syllabus: 'syllabus',
    faq: 'faq',
    testimonials: 'testimonials',
    deliveryZoomUrl: 'delivery_zoom_url',
    deliveryWhatsappUrl: 'delivery_whatsapp_url',
    deliveryNotionUrl: 'delivery_notion_url',
    instructorName: 'instructor_name',
    instructorBio: 'instructor_bio',
    instructorImageUrl: 'instructor_image_url',
    paymentLinkUrl: 'payment_link_url',
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (body[camel] !== undefined) {
      const v = body[camel];
      // Numbers: coerce; empty strings → null so admin can clear values.
      if (['priceInr', 'earlyBirdPriceInr', 'seatsTotal'].includes(camel)) {
        updates[snake] = v == null || v === '' ? null : Number(v);
      } else if (typeof v === 'string' && v.trim() === '') {
        updates[snake] = null;
      } else {
        updates[snake] = v;
      }
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Program update error:', error);
    return ApiResponse.error('Failed to update program');
  }
  if (!data) return ApiResponse.notFound('Program not found');

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'update',
    resource_type: 'program',
    resource_id: id,
    details: { updatedFields: Object.keys(updates).filter(k => k !== 'updated_at') },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformProgramRow(data));
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'content.delete');
  if ('error' in auth) return auth.error;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return ApiResponse.validationError('id is required');

  const supabase = getSupabaseAdmin();
  // Refuse the delete if any enrollments exist — paid or otherwise — so we
  // don't orphan the ledger. Admin can mark `status: 'archived'` instead.
  const { count } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', id);
  if (count && count > 0) {
    return ApiResponse.error(
      `Cannot delete: program has ${count} enrollment(s). Archive it instead.`,
      409,
    );
  }

  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) {
    console.error('Program delete error:', error);
    return ApiResponse.error('Failed to delete program');
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'delete',
    resource_type: 'program',
    resource_id: id,
    details: {},
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(null);
}
