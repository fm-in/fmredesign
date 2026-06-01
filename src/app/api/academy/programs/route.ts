/**
 * Public FM Academy — programs listing.
 *
 *   GET /api/academy/programs           — list every program with status='open'
 *   GET /api/academy/programs?slug=X    — single program by slug
 *
 * Reads from the `programs_public` SQL view so we can never accidentally
 * leak delivery URLs or other admin-only fields. No auth required.
 *
 * Cache: short revalidation (60s) — workshops can be added during the day,
 * but full SSR on every request is overkill for a marketing page.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { transformProgramRow } from '@/lib/admin/academy-types';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const supabase = getSupabaseAdmin();

  if (slug) {
    const { data, error } = await supabase
      .from('programs_public')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) return ApiResponse.notFound('Program not found');
    return ApiResponse.success(transformProgramRow(data));
  }

  const { data, error } = await supabase
    .from('programs_public')
    .select('*')
    .order('starts_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Public programs error:', error);
    return ApiResponse.error('Failed to fetch programs');
  }

  return ApiResponse.success((data || []).map(transformProgramRow));
}
