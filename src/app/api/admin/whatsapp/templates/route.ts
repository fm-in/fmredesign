/**
 * The approved templates, for the inbox to offer once the 24-hour window has
 * shut and free text is no longer allowed.
 *
 * Read from Meta each time rather than mirrored into our database: approval
 * status changes on their side without telling us, and a stale copy would
 * offer a template that now fails to send.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { listApprovedTemplates } from '@/lib/whatsapp/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;
  return ApiResponse.success({ templates: await listApprovedTemplates() });
}
