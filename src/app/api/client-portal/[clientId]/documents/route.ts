/**
 * Client Portal Documents API
 * GET  — List client-visible documents
 * POST — Client uploads a file (50 MB limit)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabase';
import { resolveClientId } from '@/lib/client-portal/resolve-client';
import { requireClientAuth } from '@/lib/client-session';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import {
  uploadFile,
  ensureClientFolder,
  findSubFolder,
} from '@/lib/google-drive';
import { notifyAdmins } from '@/lib/notifications';
import { MAX_FILE_SIZE_CLIENT } from '@/lib/document-types';
import type { DocumentCategory } from '@/lib/document-types';

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 });
    }

    const authError = await requireClientAuth(request, clientId);
    if (authError) return authError;

    const resolved = await resolveClientId(clientId);
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('client_documents')
      .select('*')
      .eq('client_id', resolved.id)
      .eq('client_visible', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const projectId = searchParams.get('projectId');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Supabase documents query error:', error);
      return NextResponse.json({ success: true, data: [], total: 0 });
    }

    // Enrich with project names
    if (documents?.length) {
      const pIds = [...new Set(documents.filter(d => d.project_id).map(d => d.project_id))];
      if (pIds.length > 0) {
        const { data: projects } = await supabaseAdmin
          .from('projects')
          .select('id, name')
          .in('id', pIds);
        const pMap = new Map((projects || []).map(p => [p.id, p.name]));
        documents.forEach(d => {
          if (d.project_id) d.project_name = pMap.get(d.project_id) || null;
        });
      }
    }

    // Get storage info
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('storage_limit_mb')
      .eq('id', resolved.id)
      .single();

    const totalBytes = (documents || []).reduce(
      (sum, d) => sum + (Number(d.file_size) || 0),
      0
    );
    const limitMb = client?.storage_limit_mb || 500;

    const docDefaults = {
      description: '',
      fileType: 'document',
      fileSize: 0,
      category: 'general',
      uploadedBy: 'admin',
      uploadedByName: '',
      driveWebViewLink: null,
      version: 1,
    };
    const transformed = (documents || []).map((doc) => toCamelCaseKeys(doc, docDefaults));

    return NextResponse.json({
      success: true,
      data: transformed,
      total: transformed.length,
      storage: {
        usedBytes: totalBytes,
        limitBytes: limitMb * 1024 * 1024,
        percentage: Math.round((totalBytes / (limitMb * 1024 * 1024)) * 100),
        fileCount: (documents || []).length,
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 });
    }

    const authError = await requireClientAuth(request, clientId);
    if (authError) return authError;

    const resolved = await resolveClientId(clientId);
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as DocumentCategory) || 'client_upload';
    const description = (formData.get('description') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_CLIENT) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 50 MB limit' },
        { status: 413 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check storage limit
    const { data: client } = await supabase
      .from('clients')
      .select('name, drive_folder_id, storage_limit_mb')
      .eq('id', resolved.id)
      .single();

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const limitBytes = (client.storage_limit_mb || 500) * 1024 * 1024;

    const { data: existingDocs } = await supabase
      .from('client_documents')
      .select('file_size')
      .eq('client_id', resolved.id);

    const currentUsage = (existingDocs || []).reduce(
      (sum, d) => sum + (Number(d.file_size) || 0),
      0
    );

    if (currentUsage + file.size > limitBytes) {
      return NextResponse.json(
        { success: false, error: 'Storage limit exceeded' },
        { status: 413 }
      );
    }

    // Ensure client folder
    const clientFolderId = await ensureClientFolder(
      resolved.id,
      client.name,
      client.drive_folder_id
    );

    if (!client.drive_folder_id) {
      await supabase
        .from('clients')
        .update({ drive_folder_id: clientFolderId })
        .eq('id', resolved.id);
    }

    // Upload to "Client Uploads" sub-folder
    let targetFolderId = await findSubFolder(clientFolderId, 'Client Uploads');
    if (!targetFolderId) {
      targetFolderId = clientFolderId;
    }

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
        client_id: resolved.id,
        name: file.name,
        description,
        file_url: uploadResult.webViewLink || '',
        file_type: file.type || 'document',
        file_size: file.size,
        category,
        uploaded_by: 'client',
        uploaded_by_name: client.name,
        drive_file_id: uploadResult.fileId,
        drive_web_view_link: uploadResult.webViewLink,
        is_public: false,
        client_visible: true,
        version: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save document' },
        { status: 500 }
      );
    }

    // Notify admins
    notifyAdmins({
      type: 'document_shared',
      title: 'Client uploaded a document',
      message: `${client.name} uploaded "${file.name}"`,
      clientId: resolved.id,
      actionUrl: `/admin/clients/${resolved.id}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        name: doc.name,
        fileSize: doc.file_size,
        category: doc.category,
      },
    });
  } catch (error) {
    console.error('Client upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
