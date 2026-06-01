/**
 * Scrape Job Runs API
 * List run history with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';

function transformRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    runParams: row.run_params,
    contactsFound: row.contacts_found,
    contactsImported: row.contacts_imported,
    contactsSkipped: row.contacts_skipped,
    errorMessage: row.error_message,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    // Joined fields
    jobName: (row as Record<string, unknown>).job_name,
    jobSourcePlatform: (row as Record<string, unknown>).job_source_platform,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('scrape_job_runs')
      .select('*, scrape_jobs!inner(name, source_platform)', { count: 'exact' });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    if (status) {
      query = query.in('status', status.split(','));
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const runs = (data || []).map((row) => {
      const job = row.scrape_jobs as Record<string, unknown> | null;
      return transformRun({
        ...row,
        job_name: job?.name,
        job_source_platform: job?.source_platform,
      });
    });

    return NextResponse.json({
      success: true,
      data: runs,
      total: count ?? runs.length,
    });
  } catch (error) {
    console.error('Error fetching scrape job runs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch run history' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { runId, action } = body;

    if (action === 'cancel') {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('scrape_job_runs')
        .update({
          status: 'cancelled',
          error_message: 'Cancelled by admin',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)
        .in('status', ['pending', 'running']);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Run cancelled' });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating scrape job run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update run' },
      { status: 500 }
    );
  }
}
