/** Sales tasks for My Work (scope=mine) or the whole team (admins, scope=all). */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { isSalesAdmin } from '@/lib/sales/access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  const scope = request.nextUrl.searchParams.get('scope') === 'all' ? 'all' : 'mine';
  const statusParam = request.nextUrl.searchParams.get('status');
  const status = statusParam === 'done' || statusParam === 'all' ? statusParam : 'open';

  let query = getSupabaseAdmin()
    .from('sales_tasks')
    .select('*, leads(id, name, company, email, phone_e164, owner_id)')
    .order('due_at', { ascending: true })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);
  if (scope === 'mine' || !isSalesAdmin(auth.user)) query = query.eq('owner_id', auth.user.id);

  const { data, error } = await query;
  if (error) {
    console.error('[sales] task list failed:', error);
    return ApiResponse.error('Could not load tasks');
  }

  return ApiResponse.success(
    (data ?? []).map((row: Record<string, unknown> & { leads?: Record<string, unknown> | null }) => {
      const { leads, ...task } = row;
      return { ...toCamelCaseKeys(task), lead: leads ? toCamelCaseKeys(leads) : null };
    })
  );
}
