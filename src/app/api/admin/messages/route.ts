/**
 * Admin Client Messages API
 * GET  — list messages for a client
 * POST — send a message to a client
 * PUT  — mark message(s) as read
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminAuth, requirePermission } from '@/lib/admin-auth-middleware';
import { notifyClient } from '@/lib/notifications';
import { ApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.read');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return ApiResponse.validationError('Client ID is required');
    }

    const { data: messages, error } = await supabaseAdmin
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Messages query error:', error);
      // Soft-fail with empty list — UI handles "no messages" cleanly,
      // and this matches the prior behavior of never failing-loud here.
      return ApiResponse.success([]);
    }

    const transformed = (messages || []).map((m) => ({
      id: m.id,
      clientId: m.client_id,
      senderType: m.sender_type,
      senderName: m.sender_name,
      subject: m.subject,
      message: m.message,
      isRead: m.is_read,
      readAt: m.read_at,
      createdAt: m.created_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return ApiResponse.error('Failed to fetch messages');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { clientId, subject, message } = body;

    if (!clientId || !message?.trim()) {
      return ApiResponse.validationError('Client ID and message are required');
    }

    const { data: msg, error } = await supabaseAdmin
      .from('client_messages')
      .insert({
        client_id: clientId,
        sender_type: 'admin',
        sender_name: auth.user.name,
        subject: subject || null,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Insert message error:', error);
      return ApiResponse.error('Failed to send message');
    }

    // Fire-and-forget: notify client
    notifyClient(clientId, {
      type: 'general',
      title: 'New message from Freaking Minds',
      message: subject || 'You have a new message',
      actionUrl: `/client/${clientId}`,
    });

    return ApiResponse.success({
      id: msg.id,
      clientId: msg.client_id,
      senderType: msg.sender_type,
      senderName: msg.sender_name,
      subject: msg.subject,
      message: msg.message,
      isRead: msg.is_read,
      createdAt: msg.created_at,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return ApiResponse.error('Failed to send message');
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { messageId, isRead } = body;

    if (!messageId) {
      return ApiResponse.validationError('Message ID is required');
    }

    const updates: Record<string, unknown> = {};
    if (isRead !== undefined) {
      updates.is_read = isRead;
      if (isRead) updates.read_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('client_messages')
      .update(updates)
      .eq('id', messageId);

    if (error) {
      console.error('Update message error:', error);
      return ApiResponse.error('Failed to update message');
    }

    return ApiResponse.success(null);
  } catch (error) {
    console.error('Error updating message:', error);
    return ApiResponse.error('Failed to update message');
  }
}
