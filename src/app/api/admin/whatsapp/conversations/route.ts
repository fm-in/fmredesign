/** Settings → Inbox: every lead with WhatsApp history, most recent first. */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { listConversations } from '@/lib/whatsapp/conversations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;
  return ApiResponse.success({ conversations: await listConversations() });
}
