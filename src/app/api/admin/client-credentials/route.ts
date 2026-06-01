/**
 * Admin Client Credentials API
 * GET    — list credentials for a client (masked) — ?clientId=xxx
 * POST   — add credential for a client
 * PUT    — update credential
 * DELETE — delete credential — ?id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { encryptToken, decryptToken } from '@/lib/social/token-crypto';
import { maskCredentials } from '@/lib/admin/credential-types';
import type { ClientCredential } from '@/lib/admin/credential-types';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';

// ────────────────────────────────────────────────────────────
// GET — list credentials for a client (masked)
// ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.portal');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('client_credentials')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch credentials' }, { status: 500 });
  }

  const masked = (data as ClientCredential[]).map((row) => {
    try {
      const decrypted = JSON.parse(decryptToken(row.credentials));
      return {
        id: row.id,
        client_id: row.client_id,
        platform: row.platform,
        credential_type: row.credential_type,
        label: row.label,
        credentials_masked: maskCredentials(decrypted),
        status: row.status,
        notes: row.notes,
        added_by: row.added_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch {
      return {
        id: row.id,
        client_id: row.client_id,
        platform: row.platform,
        credential_type: row.credential_type,
        label: row.label,
        credentials_masked: {},
        status: row.status,
        notes: row.notes,
        added_by: row.added_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }
  });

  return NextResponse.json({ success: true, data: masked });
}

// ────────────────────────────────────────────────────────────
// POST — add credential for a client
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.portal');
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { client_id, platform, credential_type, label, credentials, notes } = body;

  if (!client_id || !platform || !credentials || typeof credentials !== 'object') {
    return NextResponse.json(
      { success: false, error: 'client_id, platform, and credentials are required' },
      { status: 400 }
    );
  }

  const encrypted = encryptToken(JSON.stringify(credentials));

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('client_credentials')
    .insert({
      client_id,
      platform,
      credential_type: credential_type || 'login',
      label: label || null,
      credentials: encrypted,
      notes: notes || null,
      added_by: auth.user.id,
    })
    .select('id, platform, credential_type, label, status, notes, added_by, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({ success: false, error: 'Failed to save credential' }, { status: 500 });
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'create',
    resource_type: 'client_credential',
    resource_id: data.id,
    details: { clientId: client_id, platform, credential_type: data.credential_type, label: data.label },
    ip_address: getClientIP(request),
  });

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      client_id,
      credentials_masked: maskCredentials(credentials),
    },
  }, { status: 201 });
}

// ────────────────────────────────────────────────────────────
// PUT — update credential
// ────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.portal');
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { id, platform, credential_type, label, credentials, notes, status } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (platform) updates.platform = platform;
  if (credential_type) updates.credential_type = credential_type;
  if (label !== undefined) updates.label = label || null;
  if (notes !== undefined) updates.notes = notes || null;
  if (status) updates.status = status;
  if (credentials && typeof credentials === 'object') {
    updates.credentials = encryptToken(JSON.stringify(credentials));
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('client_credentials')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json({ success: false, error: 'Failed to update credential' }, { status: 500 });
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'update',
    resource_type: 'client_credential',
    resource_id: id,
    details: {
      updatedFields: Object.keys(updates),
      // Never include credential values; record rotation flag if creds were changed.
      credentialsRotated: 'credentials' in updates,
    },
    ip_address: getClientIP(request),
  });

  return NextResponse.json({ success: true });
}

// ────────────────────────────────────────────────────────────
// DELETE — remove credential
// ────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.portal');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('client_credentials')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete credential' }, { status: 500 });
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'delete',
    resource_type: 'client_credential',
    resource_id: id,
    details: {},
    ip_address: getClientIP(request),
  });

  return NextResponse.json({ success: true });
}
