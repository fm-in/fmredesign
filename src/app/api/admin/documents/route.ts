/**
 * Admin Documents API
 * GET  — List documents for a client (includes internal-only)
 * POST — Upload a document (via FormData)
 * PUT  — Update document metadata
 * DELETE — Delete a document
 */

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

// Vercel: increase timeout for Google Drive operations
export const maxDuration = 60;
import {
  uploadFile,
  ensureClientFolder,
  deleteFile,
  findSubFolder,
} from '@/lib/google-drive';
import { logAuditEvent } from '@/lib/admin/audit-log';
import { notifyClient } from '@/lib/notifications';
import { notifyRecipient, documentSharedEmail } from '@/lib/email/send';
import {
  MAX_FILE_SIZE_ADMIN,
  CATEGORY_TO_FOLDER,
  transformDocumentRow,
} from '@/lib/document-types';
import type { DocumentCategory } from '@/lib/document-types';

// ── GET ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.read');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');
  const category = searchParams.get('category');
  const projectId = searchParams.get('projectId');

  if (!clientId) {
    return ApiResponse.validationError('clientId is required');
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('client_documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: documents, error } = await query;

  // Enrich with project names
  if (documents?.length) {
    const projectIds = [...new Set(documents.filter(d => d.project_id).map(d => d.project_id))];
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
      documents.forEach(d => {
        if (d.project_id) d.project_name = projectMap.get(d.project_id) || null;
      });
    }
  }

  if (error) {
    console.error('Documents query error:', error);
    return ApiResponse.success([], { total: 0 });
  }

  // Compute storage usage
  const totalBytes = (documents || []).reduce(
    (sum, d) => sum + (Number(d.file_size) || 0),
    0
  );

  // Get client storage limit
  const { data: client } = await supabase
    .from('clients')
    .select('storage_limit_mb')
    .eq('id', clientId)
    .single();

  const limitMb = client?.storage_limit_mb || 500;

  return ApiResponse.success(
    (documents || []).map(transformDocumentRow),
    {
      total: (documents || []).length,
      storage: {
        usedBytes: totalBytes,
        limitBytes: limitMb * 1024 * 1024,
        percentage: Math.round((totalBytes / (limitMb * 1024 * 1024)) * 100),
        fileCount: (documents || []).length,
      },
    }
  );
}

// ── POST (Upload) ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const projectId = (formData.get('projectId') as string) || null;
    const category = (formData.get('category') as DocumentCategory) || 'general';
    const description = (formData.get('description') as string) || '';
    const clientVisible = formData.get('clientVisible') !== 'false';
    const isPublic = formData.get('isPublic') === 'true';

    if (!file || !clientId) {
      return ApiResponse.validationError('file and clientId are required');
    }

    if (file.size > MAX_FILE_SIZE_ADMIN) {
      return ApiResponse.error('File exceeds 250 MB limit', 413);
    }

    const supabase = getSupabaseAdmin();

    // Check storage limit
    const { data: client } = await supabase
      .from('clients')
      .select('name, drive_folder_id, storage_limit_mb')
      .eq('id', clientId)
      .single();

    if (!client) {
      return ApiResponse.notFound('Client not found');
    }

    const limitBytes = (client.storage_limit_mb || 500) * 1024 * 1024;

    // Current usage
    const { data: existingDocs } = await supabase
      .from('client_documents')
      .select('file_size')
      .eq('client_id', clientId);

    const currentUsage = (existingDocs || []).reduce(
      (sum, d) => sum + (Number(d.file_size) || 0),
      0
    );

    if (currentUsage + file.size > limitBytes) {
      return ApiResponse.error(
        `Storage limit exceeded. Used: ${Math.round(currentUsage / 1024 / 1024)} MB, Limit: ${client.storage_limit_mb} MB`,
        413
      );
    }

    // Ensure client folder in Drive
    const clientFolderId = await ensureClientFolder(
      clientId,
      client.name,
      client.drive_folder_id
    );

    // Save folder ID to client if new
    if (!client.drive_folder_id) {
      await supabase
        .from('clients')
        .update({ drive_folder_id: clientFolderId })
        .eq('id', clientId);
    }

    // Find the category sub-folder
    const folderName = CATEGORY_TO_FOLDER[category] || 'General';
    let targetFolderId = await findSubFolder(clientFolderId, folderName);
    if (!targetFolderId) {
      // Fallback to client root folder
      targetFolderId = clientFolderId;
    }

    // Upload to Drive
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadFile({
      buffer,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      folderId: targetFolderId,
    });

    // Insert DB row
    const { data: doc, error: insertError } = await supabase
      .from('client_documents')
      .insert({
        client_id: clientId,
        project_id: projectId,
        name: file.name,
        description,
        file_url: uploadResult.webViewLink || '',
        file_type: file.type || 'document',
        file_size: file.size,
        category,
        uploaded_by: 'admin',
        uploaded_by_name: 'Admin',
        drive_file_id: uploadResult.fileId,
        drive_web_view_link: uploadResult.webViewLink,
        is_public: isPublic,
        client_visible: clientVisible,
        version: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return ApiResponse.error('Failed to save document record');
    }

    // Audit log (fire-and-forget)
    logAuditEvent({
      user_id: 'system-admin',
      user_name: 'Admin',
      action: 'create',
      resource_type: 'document',
      resource_id: doc.id,
      details: { fileName: file.name, clientId, category },
    });

    // Notify client if visible
    if (clientVisible) {
      notifyClient(clientId, {
        type: 'document_shared',
        title: 'New document shared',
        message: `A new file "${file.name}" has been shared with you.`,
        actionUrl: `/client/${clientId}/documents`,
      });

      // Email the client about the shared document
      const { data: clientForEmail } = await supabase
        .from('clients')
        .select('email, name')
        .eq('id', clientId)
        .single();

      if (clientForEmail?.email) {
        const emailData = documentSharedEmail({
          clientName: clientForEmail.name || 'Client',
          fileName: file.name,
          portalUrl: `https://freakingminds.in/client/${clientId}/documents`,
        });
        notifyRecipient(clientForEmail.email, emailData.subject, emailData.html);
      }
    }

    return ApiResponse.success(transformDocumentRow(doc));
  } catch (err) {
    console.error('Document upload error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return ApiResponse.error(`Upload failed: ${message}`);
  }
}

// ── PUT (Update metadata) ────────────────────────────────
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, name, description, category, clientVisible, isPublic, projectId } = body;

    if (!id) {
      return ApiResponse.validationError('id is required');
    }

    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (clientVisible !== undefined) updates.client_visible = clientVisible;
    if (isPublic !== undefined) updates.is_public = isPublic;
    if (projectId !== undefined) updates.project_id = projectId || null;

    const { data: doc, error } = await supabase
      .from('client_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return ApiResponse.error('Failed to update document');
    }

    return ApiResponse.success(transformDocumentRow(doc));
  } catch (err) {
    console.error('Document update error:', err);
    return ApiResponse.error('Update failed');
  }
}

// ── DELETE ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.delete');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return ApiResponse.validationError('id is required');
  }

  const supabase = getSupabaseAdmin();

  // Get doc to find drive_file_id
  const { data: doc, error: fetchError } = await supabase
    .from('client_documents')
    .select('id, name, drive_file_id, client_id')
    .eq('id', id)
    .single();

  if (fetchError || !doc) {
    return ApiResponse.notFound('Document not found');
  }

  // Delete from Drive
  if (doc.drive_file_id) {
    try {
      await deleteFile(doc.drive_file_id);
    } catch (err) {
      console.error('Drive delete error (continuing):', err);
    }
  }

  // Delete from DB
  const { error: deleteError } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('DB delete error:', deleteError);
    return ApiResponse.error('Failed to delete document');
  }

  // Audit log
  logAuditEvent({
    user_id: 'system-admin',
    user_name: 'Admin',
    action: 'delete',
    resource_type: 'document',
    resource_id: doc.id,
    details: { fileName: doc.name, clientId: doc.client_id },
  });

  return ApiResponse.success(null);
}
