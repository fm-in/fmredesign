/**
 * Content Approval Request — POST /api/admin/content/[id]/request-approval
 *
 * Flips the content item to `status: 'review'` and notifies the linked
 * client that something is waiting on their approval in the portal.
 *
 * This is the admin half of the content approval loop. The client-portal
 * half (a dedicated approval UI with approve / request-changes actions)
 * exists conceptually; surfacing it on the portal page is a follow-up. The
 * existing `status: 'review'` value is already understood throughout the
 * dashboard ("Content needing review" pulls from this state), so flipping
 * to it cleanly slots into the rest of the system.
 *
 * Auth: requirePermission('content.write') — editors and above can request
 * client approval on their own drafts; viewers cannot.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { notifyClient } from '@/lib/notifications';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  if (!id) return ApiResponse.validationError('Content id is required');

  const supabase = getSupabaseAdmin();

  // Load the content item so we can route the notification to the right
  // client and short-circuit the request if it doesn't exist or is already
  // past the review stage.
  const { data: content, error: loadError } = await supabase
    .from('content_calendar')
    .select('id, title, client_id, status')
    .eq('id', id)
    .single();

  if (loadError || !content) {
    return ApiResponse.notFound('Content item not found');
  }

  if (content.status === 'published' || content.status === 'cancelled') {
    return ApiResponse.validationError(
      `Cannot request approval on ${content.status} content`,
    );
  }

  // Flip status; updated_at is touched so dashboards re-sort correctly.
  const { error: updateError } = await supabase
    .from('content_calendar')
    .update({ status: 'review', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    console.error('request-approval update failed:', updateError);
    return ApiResponse.error('Failed to flag for approval');
  }

  // Notify the client (non-fatal). Wraps a generic message so this still
  // reads sensibly until the dedicated client-portal approval surface ships.
  if (content.client_id) {
    notifyClient(content.client_id as string, {
      type: 'general',
      title: 'Content waiting for your approval',
      message: content.title
        ? `"${content.title}" is ready for your review.`
        : 'A new content item is ready for your review.',
      actionUrl: `/client/${content.client_id}/content`,
    });
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'update',
    resource_type: 'content_calendar',
    resource_id: id,
    details: {
      action: 'request_approval',
      previousStatus: content.status,
      newStatus: 'review',
    },
    ip_address: getClientIP(request),
  }).catch((err) => {
    console.error('Audit log for content approval request failed:', err);
  });

  return ApiResponse.success({
    id,
    status: 'review',
    notifiedClientId: content.client_id ?? null,
  });
}
