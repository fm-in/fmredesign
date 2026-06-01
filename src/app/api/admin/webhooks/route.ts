import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get('deliveries');

  // If ?deliveries=webhookId, return delivery logs for that webhook
  if (webhookId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('outgoing_webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return ApiResponse.error('Failed to fetch deliveries');
    }
    return ApiResponse.success(data);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('outgoing_webhooks')
      .select('id, name, url, events, is_active, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ApiResponse.success(data);
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return ApiResponse.error('Failed to fetch webhooks');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name, url, events, secret } = body;

    if (!name || !url || !Array.isArray(events) || events.length === 0) {
      return ApiResponse.validationError('name, url, and events[] are required');
    }

    const webhookSecret = secret || randomBytes(32).toString('hex');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('outgoing_webhooks')
      .insert({
        name,
        url,
        events,
        secret: webhookSecret,
        created_by: auth.user.id,
      })
      .select('id, name, url, events, is_active, created_at')
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'outgoing_webhook',
      resource_id: data.id,
      details: { name, url, events },
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for webhook create failed:', err);
    });

    return ApiResponse.success(
      { ...data, secret: webhookSecret },
      { message: 'Webhook created. Save the signing secret — it will not be shown again.' }
    );
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return ApiResponse.error('Failed to create webhook');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, name, url, events, is_active } = body;

    if (!id) {
      return ApiResponse.validationError('Webhook ID is required');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (is_active !== undefined) updates.is_active = is_active;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('outgoing_webhooks')
      .update(updates)
      .eq('id', id)
      .select('id, name, url, events, is_active, updated_at')
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'outgoing_webhook',
      resource_id: id,
      details: updates,
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for webhook update failed:', err);
    });

    return ApiResponse.success(data);
  } catch (error) {
    console.error('Failed to update webhook:', error);
    return ApiResponse.error('Failed to update webhook');
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return ApiResponse.validationError('Webhook ID is required');
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('outgoing_webhooks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'outgoing_webhook',
      resource_id: id,
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for webhook delete failed:', err);
    });

    return ApiResponse.success(null);
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return ApiResponse.error('Failed to delete webhook');
  }
}
