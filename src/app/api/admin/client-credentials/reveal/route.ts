/**
 * Admin Credential Reveal API
 * GET ?id=xxx — returns decrypted credential values (gated + audit-logged)
 *
 * This endpoint is intentionally separate from the main credentials API
 * to make it clear that revealing secrets is a distinct, auditable action.
 *
 * Every reveal is logged via logAuditEvent with action='read' and
 * resource_type='client_credential_reveal' so the action is traceable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { decryptToken } from '@/lib/social/token-crypto';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.portal');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('client_credentials')
    .select('id, client_id, platform, credential_type, label, credentials')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Credential not found' }, { status: 404 });
  }

  try {
    const decrypted = JSON.parse(decryptToken(data.credentials));

    // Always record reveals — the audit log is the accountability trail for
    // an inherently risky action. Fail soft: log errors but still serve the
    // value so legitimate operators are not blocked.
    //
    // We use action='export' because AuditAction has no 'reveal'/'read'
    // member, and exporting a secret out of its encrypted vault is the
    // closest semantic match (and is auditable in dashboards filtering on
    // data-exfiltration actions).
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'export',
      resource_type: 'client_credential_reveal',
      resource_id: data.id,
      details: {
        clientId: data.client_id,
        platform: data.platform,
        credentialType: data.credential_type,
        label: data.label,
      },
      ip_address: getClientIP(request),
    }).catch((err) => {
      console.error('Audit log for credential reveal failed:', err);
    });

    return NextResponse.json({ success: true, data: decrypted });
  } catch (error) {
    console.error('Credential decryption error:', error);
    return NextResponse.json({ success: false, error: 'Failed to decrypt credential' }, { status: 500 });
  }
}
