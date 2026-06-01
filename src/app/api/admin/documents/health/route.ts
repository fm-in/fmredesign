/**
 * Drive Health Check — diagnoses Google Drive connectivity issues
 * GET /api/admin/documents/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import crypto from 'crypto';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const checks: Record<string, string> = {};

  // 1. Check env vars exist
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const b64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const impersonateEmail = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL;

  checks['GOOGLE_SERVICE_ACCOUNT_EMAIL'] = email ? `SET (${email})` : 'MISSING';
  // Never echo any prefix of the private key — even the first ~30 chars
  // include the BEGIN PRIVATE KEY header plus the first bytes of RSA material.
  checks['GOOGLE_SERVICE_ACCOUNT_KEY'] = rawKey
    ? `SET (length: ${rawKey.length})`
    : 'MISSING';
  checks['GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'] = b64Key ? `SET (length: ${b64Key.length})` : 'MISSING';
  checks['GOOGLE_DRIVE_ROOT_FOLDER_ID'] = rootFolderId ? `SET (${rootFolderId})` : 'MISSING';
  checks['GOOGLE_DRIVE_IMPERSONATE_EMAIL'] = impersonateEmail ? `SET (${impersonateEmail})` : 'NOT SET (service account will use own quota)';

  const hasKey = rawKey || b64Key;
  if (!email || !hasKey || !rootFolderId) {
    return NextResponse.json({ success: false, checks, error: 'Missing env vars' });
  }

  // 2. Check key format
  let keySource = rawKey || '';
  if (!keySource && b64Key) {
    keySource = Buffer.from(b64Key, 'base64').toString('utf-8');
    checks['key_source'] = 'base64';
  } else {
    checks['key_source'] = 'raw';
  }
  const privateKey = keySource.replace(/\\n/g, '\n');
  checks['key_starts_with_BEGIN'] = String(privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
  checks['key_has_real_newlines'] = String(privateKey.includes('\n'));
  checks['key_processed_length'] = String(privateKey.length);

  // 3. Test RSA signing
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update('test');
    const sig = signer.sign(privateKey, 'base64url');
    checks['rsa_signing'] = `OK (sig length: ${sig.length})`;
  } catch (err) {
    checks['rsa_signing'] = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ success: false, checks, error: 'RSA signing failed' });
  }

  // 4. Test token exchange
  try {
    const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    const SCOPE = 'https://www.googleapis.com/auth/drive';

    const b64url = (s: string) => Buffer.from(s).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims: Record<string, unknown> = { iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
    if (impersonateEmail) claims.sub = impersonateEmail;
    const payload = b64url(JSON.stringify(claims));
    const signInput = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(privateKey, 'base64url');
    const jwt = `${signInput}.${signature}`;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    });

    if (!res.ok) {
      const text = await res.text();
      checks['token_exchange'] = `FAILED: ${res.status} ${text}`;
      return NextResponse.json({ success: false, checks, error: 'Token exchange failed' });
    }

    const data = await res.json();
    checks['token_exchange'] = `OK (expires in ${data.expires_in}s)`;

    // 5. Test Drive API access to root folder
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${data.access_token}` } }
    );

    if (!driveRes.ok) {
      const text = await driveRes.text();
      checks['drive_root_folder'] = `FAILED: ${driveRes.status} ${text}`;
      return NextResponse.json({ success: false, checks, error: 'Drive API access failed' });
    }

    const folder = await driveRes.json();
    checks['drive_root_folder'] = `OK (name: "${folder.name}")`;
  } catch (err) {
    checks['token_exchange'] = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ success: false, checks, error: 'Unexpected error' });
  }

  return NextResponse.json({ success: true, checks, message: 'All checks passed' });
}
