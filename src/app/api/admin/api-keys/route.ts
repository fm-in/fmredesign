import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateApiKey } from '@/lib/api-key-auth';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.read');
  if ('error' in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, rate_limit, created_by, last_used_at, expires_at, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ApiResponse.success(data);
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return ApiResponse.error('Failed to fetch API keys');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name, permissions, rate_limit, expires_at } = body;

    if (!name || typeof name !== 'string') {
      return ApiResponse.validationError('Name is required');
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return ApiResponse.validationError('At least one permission is required');
    }

    const { key, hash, prefix } = generateApiKey();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name,
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        rate_limit: rate_limit || 60,
        created_by: auth.user.id,
        expires_at: expires_at || null,
      })
      .select('id, name, key_prefix, permissions, rate_limit, created_at')
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'api_key',
      resource_id: data.id,
      details: { name, permissions },
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for API key create failed:', err);
    });

    // Return the full key ONCE — it cannot be retrieved again
    return ApiResponse.success(
      { ...data, key },
      { message: 'API key created. Copy the key now — it will not be shown again.' }
    );
  } catch (error) {
    console.error('Failed to create API key:', error);
    return ApiResponse.error('Failed to create API key');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, name, permissions, rate_limit, is_active } = body;

    if (!id) {
      return ApiResponse.validationError('API key ID is required');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    if (rate_limit !== undefined) updates.rate_limit = rate_limit;
    if (is_active !== undefined) updates.is_active = is_active;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .select('id, name, key_prefix, permissions, rate_limit, is_active, updated_at')
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'api_key',
      resource_id: id,
      details: updates,
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for API key update failed:', err);
    });

    return ApiResponse.success(data);
  } catch (error) {
    console.error('Failed to update API key:', error);
    return ApiResponse.error('Failed to update API key');
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiResponse.validationError('API key ID is required');
    }

    // Soft delete
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'api_key',
      resource_id: id,
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for API key delete failed:', err);
    });

    return ApiResponse.success(null);
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return ApiResponse.error('Failed to delete API key');
  }
}
