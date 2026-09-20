/** One WhatsApp thread, with the state of its 24-hour reply window. */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { loadLead } from '@/lib/sales/lead-store';
import { loadThread, windowStateFor } from '@/lib/whatsapp/conversations';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ leadId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  const { leadId } = await params;
  const lead = await loadLead(leadId);
  if (!lead) return ApiResponse.notFound('Lead not found');
  if (!canAccessLead(auth.user, lead)) return ApiResponse.error('Forbidden', 403);

  const [messages, window] = await Promise.all([loadThread(leadId), windowStateFor(leadId)]);

  return ApiResponse.success({
    lead: { id: lead.id, name: lead.name, phoneE164: lead.phone_e164, status: lead.status },
    messages,
    window,
  });
}
