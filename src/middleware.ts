/**
 * Next.js Middleware
 * Protects /admin/* and /client/* routes server-side by checking session cookies.
 * Redirects unauthenticated users to the appropriate login page.
 *
 * Uses Web Crypto API (Edge Runtime compatible) instead of Node.js crypto.
 */

import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'fm-admin-session';
const CLIENT_SESSION_COOKIE = 'fm_client_session';
const TALENT_SESSION_COOKIE = 'fm_talent_session';
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLIENT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TALENT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * HMAC-SHA256 using Web Crypto API (Edge Runtime compatible).
 * Returns hex-encoded signature.
 */
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidAdminSession(token: string, adminPassword: string): Promise<boolean> {
  if (!token.includes('.')) return false;

  const [timestampStr, signature] = token.split('.');
  if (!timestampStr || !signature) return false;

  try {
    const expectedSignature = await hmacSha256(adminPassword, timestampStr);

    if (!constantTimeEqual(signature, expectedSignature)) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > MAX_SESSION_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate HMAC-signed talent session cookie (Edge Runtime compatible).
 * Same format as client session: base64payload.hmac_hex_signature
 */
async function getValidTalentSession(
  cookieValue: string,
  signingSecret: string
): Promise<{ talentId: string; slug: string; expires: number } | null> {
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);

  try {
    const expectedSignature = await hmacSha256(signingSecret, payload);
    if (!constantTimeEqual(signature, expectedSignature)) return null;

    const json = atob(payload);
    const data = JSON.parse(json);

    if (!data.talentId || !data.expires) return null;
    if (Date.now() > data.expires) return null;

    return { talentId: data.talentId, slug: data.slug, expires: data.expires };
  } catch {
    return null;
  }
}

/**
 * Validate HMAC-signed client session cookie (Edge Runtime compatible).
 * Cookie format: base64payload.hmac_hex_signature
 * Returns the parsed session data if valid, null otherwise.
 */
async function getValidClientSession(
  cookieValue: string,
  signingSecret: string
): Promise<{ clientId: string; slug: string; expires: number } | null> {
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);

  try {
    const expectedSignature = await hmacSha256(signingSecret, payload);
    if (!constantTimeEqual(signature, expectedSignature)) return null;

    // Decode base64 payload (Edge Runtime: use atob instead of Buffer)
    const json = atob(payload);
    const data = JSON.parse(json);

    if (!data.clientId || !data.expires) return null;
    if (Date.now() > data.expires) return null;

    return { clientId: data.clientId, slug: data.slug, expires: data.expires };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || '';

  /* ── SEO: Canonical redirect — www → non-www ── */
  /* Note: Vercel handles HTTPS enforcement automatically at the edge.
     We only need to handle the www→non-www redirect here. */
  if (host.startsWith('www.')) {
    const canonicalUrl = new URL(`https://freakingminds.in${pathname}${search}`);
    return NextResponse.redirect(canonicalUrl, 301);
  }

  /* ── Admin routes ── */
  if (pathname.startsWith('/admin')) {
    // Allow auth pages (login)
    if (pathname.startsWith('/admin/auth')) {
      return NextResponse.next();
    }

    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!sessionToken || !adminPassword || !(await isValidAdminSession(sessionToken, adminPassword))) {
      const loginUrl = new URL('/admin/auth/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  /* ── Client portal routes ── */
  if (pathname.startsWith('/client')) {
    // Allow login page
    if (pathname === '/client/login' || pathname === '/client/login/') {
      return NextResponse.next();
    }

    const signingSecret = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_PASSWORD;
    if (!signingSecret) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }

    const cookieValue = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }

    const session = await getValidClientSession(cookieValue, signingSecret);
    if (!session) {
      return NextResponse.redirect(new URL('/client/login?error=session_expired', request.url));
    }

    // Extract clientId from URL: /client/[clientId]/...
    const segments = pathname.split('/');
    const urlClientId = segments[2]; // /client/<this>/...

    if (urlClientId) {
      // Check that the session's client matches the URL
      // The URL might use a slug or database ID
      if (session.clientId !== urlClientId && session.slug !== urlClientId) {
        // Client is trying to access another client's portal
        return NextResponse.redirect(new URL(`/client/${session.slug}`, request.url));
      }
    }

    // Sliding expiry: extend session if less than 85% of duration remaining (~1 day old)
    const timeRemaining = session.expires - Date.now();
    if (timeRemaining < CLIENT_SESSION_DURATION_MS * 0.85) {
      const newExpires = Date.now() + CLIENT_SESSION_DURATION_MS;

      // Re-read the original payload JSON, update expires, re-encode and re-sign
      const dotIndex = cookieValue.lastIndexOf('.');
      const originalPayload = cookieValue.substring(0, dotIndex);
      try {
        const payloadJson = JSON.parse(atob(originalPayload));
        payloadJson.expires = newExpires;
        const newPayloadB64 = btoa(JSON.stringify(payloadJson));
        const newSignature = await hmacSha256(signingSecret, newPayloadB64);
        const newCookie = `${newPayloadB64}.${newSignature}`;

        const response = NextResponse.next();
        response.cookies.set(CLIENT_SESSION_COOKIE, newCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: CLIENT_SESSION_DURATION_MS / 1000,
        });
        return response;
      } catch {
        // If refresh fails, continue without extending
        return NextResponse.next();
      }
    }

    return NextResponse.next();
  }

  /* ── Talent portal routes ── */
  if (pathname.startsWith('/creativeminds/portal')) {
    // Allow login page
    if (pathname === '/creativeminds/login' || pathname === '/creativeminds/login/') {
      return NextResponse.next();
    }

    const signingSecret = process.env.TALENT_SESSION_SECRET || process.env.ADMIN_PASSWORD;
    if (!signingSecret) {
      return NextResponse.redirect(new URL('/creativeminds/login', request.url));
    }

    const cookieValue = request.cookies.get(TALENT_SESSION_COOKIE)?.value;
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/creativeminds/login', request.url));
    }

    const session = await getValidTalentSession(cookieValue, signingSecret);
    if (!session) {
      return NextResponse.redirect(new URL('/creativeminds/login?error=session_expired', request.url));
    }

    // Cross-talent prevention: /creativeminds/portal/<slug>/...
    const segments = pathname.split('/');
    const urlSlug = segments[3]; // /creativeminds/portal/<slug>/...
    if (urlSlug && session.slug !== urlSlug) {
      return NextResponse.redirect(new URL(`/creativeminds/portal/${session.slug}`, request.url));
    }

    // Sliding expiry: extend cookie if < 85% of duration remaining
    const timeRemaining = session.expires - Date.now();
    if (timeRemaining < TALENT_SESSION_DURATION_MS * 0.85) {
      const newExpires = Date.now() + TALENT_SESSION_DURATION_MS;

      const dotIndex = cookieValue.lastIndexOf('.');
      const originalPayload = cookieValue.substring(0, dotIndex);
      try {
        const payloadJson = JSON.parse(atob(originalPayload));
        payloadJson.expires = newExpires;
        const newPayloadB64 = btoa(JSON.stringify(payloadJson));
        const newSignature = await hmacSha256(signingSecret, newPayloadB64);
        const newCookie = `${newPayloadB64}.${newSignature}`;

        const response = NextResponse.next();
        response.cookies.set(TALENT_SESSION_COOKIE, newCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: TALENT_SESSION_DURATION_MS / 1000,
        });
        return response;
      } catch {
        return NextResponse.next();
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * This ensures the www→non-www redirect fires on all public pages too.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js|map)).*)',
  ],
};
