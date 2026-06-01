/**
 * Social Accounts API
 * CRUD for managing connected Facebook/Instagram accounts per client.
 *
 * GET    /api/admin/social/accounts?clientId=xxx  — list accounts
 * POST   /api/admin/social/accounts               — add account
 * PUT    /api/admin/social/accounts               — update (toggle active)
 * DELETE /api/admin/social/accounts?id=xxx         — remove account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { encryptToken } from '@/lib/social/token-crypto';

// GET — list social accounts for a client
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  try {
    const clientId = request.nextUrl.searchParams.get('clientId');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('social_accounts')
      .select('id, client_id, platform, page_id, page_name, instagram_account_id, is_active, connected_at, connected_by, last_used_at')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const accounts = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      clientId: row.client_id,
      platform: row.platform,
      pageId: row.page_id,
      pageName: row.page_name,
      instagramAccountId: row.instagram_account_id,
      isActive: row.is_active,
      connectedAt: row.connected_at,
      connectedBy: row.connected_by,
      lastUsedAt: row.last_used_at,
    }));

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch social accounts' },
      { status: 500 }
    );
  }
}

// POST — add a new social account
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.publish');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { clientId, platform, pageId, pageName, instagramAccountId, accessToken } = body;

    if (!clientId || !platform || !pageId || !pageName || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: clientId, platform, pageId, pageName, accessToken' },
        { status: 400 }
      );
    }

    if (platform !== 'instagram' && platform !== 'facebook') {
      return NextResponse.json(
        { success: false, error: 'Platform must be "instagram" or "facebook"' },
        { status: 400 }
      );
    }

    // Encrypt the access token before storing
    const encryptedToken = encryptToken(accessToken);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('social_accounts')
      .insert({
        client_id: clientId,
        platform,
        page_id: pageId,
        page_name: pageName,
        instagram_account_id: instagramAccountId || null,
        access_token: encryptedToken,
        is_active: true,
        connected_by: auth.user.name,
      })
      .select('id, client_id, platform, page_id, page_name, instagram_account_id, is_active, connected_at, connected_by')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This account is already connected for this client' },
          { status: 409 }
        );
      }
      throw error;
    }

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'social_account',
      resource_id: data.id,
      details: { clientId, platform, pageName },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        clientId: data.client_id,
        platform: data.platform,
        pageId: data.page_id,
        pageName: data.page_name,
        instagramAccountId: data.instagram_account_id,
        isActive: data.is_active,
        connectedAt: data.connected_at,
        connectedBy: data.connected_by,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating social account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create social account' },
      { status: 500 }
    );
  }
}

// PUT — update a social account (toggle active, update token)
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.publish');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, isActive, accessToken } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof isActive === 'boolean') updates.is_active = isActive;
    if (accessToken) updates.access_token = encryptToken(accessToken);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('social_accounts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'social_account',
      resource_id: id,
      details: { updatedFields: Object.keys(updates).filter((k) => k !== 'updated_at') },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating social account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update social account' },
      { status: 500 }
    );
  }
}

// DELETE — remove a social account
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'content.publish');
  if ('error' in auth) return auth.error;

  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('social_accounts').delete().eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'social_account',
      resource_id: id,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete social account' },
      { status: 500 }
    );
  }
}
