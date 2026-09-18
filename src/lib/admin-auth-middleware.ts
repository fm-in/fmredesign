/**
 * Server-side admin authentication middleware.
 * Validates admin session token from cookies before allowing access to admin API routes.
 * Token format: timestamp.hmac_signature (password never stored in token)
 *
 * Also provides requirePermission() for RBAC enforcement on write operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseStoredPermissions, PermissionService } from '@/lib/admin/permissions';
import { validateApiKey } from '@/lib/api-key-auth';
import { rateLimitByKey } from '@/lib/rate-limiter';

const ADMIN_SESSION_COOKIE = 'fm-admin-session';
const ADMIN_USER_COOKIE = 'fm-admin-user';
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

// -----------------------------------------------------------------------
// requireAdminAuth — session-only check (read access)
// -----------------------------------------------------------------------

/**
 * Validate that the request has a valid admin session.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    // Fallback: try API key auth
    const apiKey = await validateApiKey(request);
    if (apiKey) return null; // API key auth passed

    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not configured');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // HMAC-based token: timestamp.signature
    const [timestampStr, signature] = sessionToken.split('.');

    if (!timestampStr || !signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', adminPassword)
      .update(timestampStr)
      .digest('hex');

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check token age
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > MAX_SESSION_AGE_MS) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    return null; // Auth passed
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid session token' },
      { status: 401 }
    );
  }
}

// -----------------------------------------------------------------------
// requirePermission — session + RBAC check (write access)
// -----------------------------------------------------------------------

/**
 * Verify HMAC signature on the fm-admin-user cookie payload.
 * Returns the parsed user data if valid, or null if verification fails.
 */
function verifyUserCookie(cookieValue: string, secret: string): { userId: string; role: string; name: string } | null {
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);

  if (!payload || !signature) return null;

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    if (!decoded.userId || !decoded.role || !decoded.name) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Validate admin session AND check that the authenticated user has the
 * required permission. Returns the authenticated user on success.
 *
 * Usage:
 * ```ts
 * const auth = await requirePermission(request, 'clients.write');
 * if ('error' in auth) return auth.error;
 * // auth.user.id, auth.user.name, auth.user.role, auth.user.permissions
 * ```
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ error: NextResponse } | { user: AuthenticatedUser }> {
  // 0. Try API key auth first (if Authorization: Bearer fmk_... is present)
  const apiKey = await validateApiKey(request);
  if (apiKey) {
    // Check per-key rate limit
    const rl = rateLimitByKey(apiKey.keyId, apiKey.rateLimit);
    if (!rl.allowed) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter) },
          }
        ),
      };
    }

    if (!PermissionService.hasPermission(apiKey.user.permissions, permission)) {
      return {
        error: NextResponse.json(
          { success: false, error: `Insufficient permissions. Required: ${permission}` },
          { status: 403 }
        ),
      };
    }
    return { user: apiKey.user };
  }

  // 1. Validate HMAC session cookie (reuse existing requireAdminAuth logic)
  const authError = await requireAdminAuth(request);
  if (authError) return { error: authError };

  const adminPassword = process.env.ADMIN_PASSWORD || '';

  // 2. Read fm-admin-user cookie and verify its HMAC signature
  const userCookie = request.cookies.get(ADMIN_USER_COOKIE)?.value;
  if (!userCookie) {
    return {
      error: NextResponse.json(
        { success: false, error: 'User identity not found. Please log in again.' },
        { status: 401 }
      ),
    };
  }

  const userData = verifyUserCookie(userCookie, adminPassword);
  if (!userData) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid user identity. Please log in again.' },
        { status: 401 }
      ),
    };
  }

  // 3. System admin (password auth) — gets full access, no DB lookup needed
  if (userData.userId === 'system-admin') {
    return {
      user: {
        id: 'system-admin',
        name: 'System Admin',
        role: 'super_admin',
        permissions: ['system.full_access'],
      },
    };
  }

  // 4. Mobile users — look up current permissions from DB (in case they changed)
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbUser, error } = await supabase
      .from('authorized_users')
      .select('id, name, role, permissions, status')
      .eq('id', userData.userId)
      .single();

    if (error || !dbUser) {
      return {
        error: NextResponse.json(
          { success: false, error: 'User account not found' },
          { status: 403 }
        ),
      };
    }

    if (dbUser.status !== 'active') {
      return {
        error: NextResponse.json(
          { success: false, error: 'User account disabled' },
          { status: 403 }
        ),
      };
    }

    // Parse permissions: stored as comma-separated string in DB
    const userPermissions = parseStoredPermissions(dbUser.permissions);

    // 5. Check permission using PermissionService
    if (!PermissionService.hasPermission(userPermissions, permission)) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: `Insufficient permissions. Required: ${permission}`,
          },
          { status: 403 }
        ),
      };
    }

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        permissions: userPermissions,
      },
    };
  } catch {
    return {
      error: NextResponse.json(
        { success: false, error: 'Permission check failed' },
        { status: 500 }
      ),
    };
  }
}

