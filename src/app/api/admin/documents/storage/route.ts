/**
 * Admin Document Storage API
 * GET  ?clientId=xxx — returns storage usage info
 * PUT  { clientId, storageLimitMb } — update client's storage limit
 */

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.read');
  if ('error' in auth) return auth.error;

  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return ApiResponse.validationError('clientId is required');
  }

  const supabase = getSupabaseAdmin();

  const [{ data: docs }, { data: client }] = await Promise.all([
    supabase
      .from('client_documents')
      .select('file_size')
      .eq('client_id', clientId),
    supabase
      .from('clients')
      .select('storage_limit_mb')
      .eq('id', clientId)
      .single(),
  ]);

  const usedBytes = (docs || []).reduce((sum, d) => sum + (Number(d.file_size) || 0), 0);
  const limitMb = client?.storage_limit_mb || 500;
  const limitBytes = limitMb * 1024 * 1024;

  return ApiResponse.success({
    usedBytes,
    limitBytes,
    percentage: Math.round((usedBytes / limitBytes) * 100),
    fileCount: (docs || []).length,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const { clientId, storageLimitMb } = await request.json();

    if (!clientId || typeof storageLimitMb !== 'number' || storageLimitMb < 1) {
      return ApiResponse.validationError('clientId and valid storageLimitMb are required');
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('clients')
      .update({ storage_limit_mb: storageLimitMb })
      .eq('id', clientId);

    if (error) {
      return ApiResponse.error('Update failed');
    }

    return ApiResponse.success(null);
  } catch (error) {
    console.error('Storage limit update error:', error);
    return ApiResponse.validationError('Invalid request');
  }
}
