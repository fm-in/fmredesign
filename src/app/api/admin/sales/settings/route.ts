/** Settings → Sales: automation switch, booking link, rotation and webhook status. */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getClientIP, logAuditEvent } from '@/lib/admin/audit-log';
import { SITE_URL } from '@/lib/site-url';
import { hasSalesAccess } from '@/lib/sales/access';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdapterConfigured, SALES_WEBHOOK_ADAPTERS } from '@/lib/sales/intake/adapters/registry';
import { firstIssue, salesSettingsSchema } from '@/lib/sales/schemas';
import { getSalesSettings, updateSalesSettings } from '@/lib/sales/settings';
import { isUnsubscribeConfigured } from '@/lib/sales/unsubscribe-token';

export const dynamic = 'force-dynamic';

async function buildPayload() {
  const supabase = getSupabaseAdmin();
  const [settings, users] = await Promise.all([
    getSalesSettings(),
    supabase.from('authorized_users').select('id, name, email, role, in_sales_rotation').eq('status', 'active').order('name', { ascending: true }),
  ]);

  const webhooks = await Promise.all(
    Object.entries(SALES_WEBHOOK_ADAPTERS).map(async ([source, adapter]) => {
      const { data: last } = await supabase
        .from('webhook_logs')
        .select('created_at, error, processed')
        .eq('provider', `sales:${source}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        source,
        url: `${SITE_URL}/api/webhooks/sales/${source}`,
        configured: isAdapterConfigured(adapter),
        missingEnv: adapter.requiredEnv.filter((name) => !process.env[name]),
        lastReceivedAt: last?.created_at ?? null,
        lastError: last?.error ?? null,
      };
    })
  );

  return {
    settings,
    users: (users.data ?? []).map((row: { id: string; name: string; email: string | null; role: string; in_sales_rotation: boolean | null }) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      inRotation: row.in_sales_rotation === true,
    })),
    webhooks,
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.SALES_REPLY_TO && isUnsubscribeConfigured()),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;
  try {
    return ApiResponse.success(await buildPayload());
  } catch (error) {
    console.error('[sales] settings load failed:', error);
    return ApiResponse.error('Could not load sales settings');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;

  const parsed = salesSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));
  const { rotation, ...patch } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    if (rotation && rotation.length > 0) {
      const distinctIds = Array.from(new Set(rotation));
      const { data: existingUsers, error: lookupError } = await supabase
        .from('authorized_users')
        .select('id, permissions')
        .in('id', distinctIds);
      if (lookupError) throw lookupError;
      if (!existingUsers || existingUsers.length < distinctIds.length) {
        return ApiResponse.validationError('One or more team members in the rotation do not exist');
      }
      if (!existingUsers.every((user: { permissions: unknown }) => hasSalesAccess(user.permissions))) {
        return ApiResponse.validationError('Everyone in the rotation needs sales access');
      }
    }

    if (Object.keys(patch).length > 0) await updateSalesSettings(patch);

    if (rotation) {
      const { error: clearError } = await supabase.from('authorized_users').update({ in_sales_rotation: false }).eq('in_sales_rotation', true);
      if (clearError) throw clearError;
      if (rotation.length > 0) {
        const { error: setError } = await supabase.from('authorized_users').update({ in_sales_rotation: true }).in('id', rotation);
        if (setError) throw setError;
      }
    }

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'sales_settings',
      details: { ...patch, rotation: rotation ?? null },
      ip_address: getClientIP(request),
    });

    return ApiResponse.success(await buildPayload());
  } catch (error) {
    console.error('[sales] settings save failed:', error);
    return ApiResponse.error('Could not save sales settings');
  }
}
