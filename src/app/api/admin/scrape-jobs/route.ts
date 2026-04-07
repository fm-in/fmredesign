/**
 * Scrape Jobs API Routes
 * Handles CRUD for scrape jobs + trigger runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import type { ScrapeSourcePlatform, ScrapeScheduleType } from '@/lib/admin/scrape-job-types';

function transformJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    sourcePlatform: row.source_platform,
    params: row.params,
    scheduleType: row.schedule_type,
    isActive: row.is_active,
    rotationGroupId: row.rotation_group_id,
    createdBy: row.created_by,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  };
}

// GET /api/admin/scrape-jobs — List jobs with latest run info + stats
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Fetch latest run for each job
    const jobIds = (jobs || []).map((j) => j.id as string);
    let latestRuns: Record<string, unknown>[] = [];
    if (jobIds.length > 0) {
      const { data: runs } = await supabase
        .from('scrape_job_runs')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      latestRuns = runs || [];
    }

    // Group latest run per job
    const latestRunByJob: Record<string, Record<string, unknown>> = {};
    for (const run of latestRuns) {
      const jid = run.job_id as string;
      if (!latestRunByJob[jid]) {
        latestRunByJob[jid] = run;
      }
    }

    const transformedJobs = (jobs || []).map((j) => ({
      ...transformJob(j),
      latestRun: latestRunByJob[j.id as string]
        ? transformRun(latestRunByJob[j.id as string])
        : null,
    }));

    // Compute stats
    const { data: allRuns } = await supabase
      .from('scrape_job_runs')
      .select('status, contacts_imported, contacts_found, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const stats = {
      totalJobs: (jobs || []).length,
      activeJobs: (jobs || []).filter((j) => j.is_active).length,
      totalRuns: (allRuns || []).length,
      totalContactsImported: (allRuns || []).reduce(
        (sum, r) => sum + ((r.contacts_imported as number) || 0),
        0
      ),
    };

    return NextResponse.json({ success: true, data: transformedJobs, stats });
  } catch (error) {
    console.error('Error fetching scrape jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scrape jobs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scrape-jobs — Create a new job
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name, sourcePlatform, params, scheduleType, rotationGroupId } = body as {
      name: string;
      sourcePlatform: ScrapeSourcePlatform;
      params: Record<string, unknown>;
      scheduleType: ScrapeScheduleType;
      rotationGroupId?: string;
    };

    if (!name || !sourcePlatform) {
      return NextResponse.json(
        { success: false, error: 'name and sourcePlatform are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('scrape_jobs')
      .insert({
        name,
        source_platform: sourcePlatform,
        params: params || {},
        schedule_type: scheduleType || 'manual',
        rotation_group_id: rotationGroupId || null,
        created_by: 'admin',
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'scrape_job',
      resource_id: data.id as string,
      details: { name, sourcePlatform, scheduleType },
      ip_address: getClientIP(request),
    });

    return NextResponse.json(
      { success: true, data: transformJob(data) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating scrape job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scrape job' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scrape-jobs — Update job OR trigger a run
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Trigger a run
    if (action === 'trigger') {
      const { data: job, error: jobErr } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', id)
        .single();
      if (jobErr || !job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }

      // Rate limit: no more than 5 runs triggered in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: recentRunCount } = await supabase
        .from('scrape_job_runs')
        .select('id', { count: 'exact', head: true })
        .eq('triggered_by', 'manual')
        .gte('created_at', tenMinutesAgo);

      if ((recentRunCount ?? 0) >= 5) {
        return NextResponse.json(
          { success: false, error: 'Rate limit: max 5 manual runs per 10 minutes. Please wait.' },
          { status: 429 }
        );
      }

      // Prevent duplicate: block if this job already has a pending/running run
      const { count: activeRunCount } = await supabase
        .from('scrape_job_runs')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', id)
        .in('status', ['pending', 'running']);

      if ((activeRunCount ?? 0) > 0) {
        return NextResponse.json(
          { success: false, error: 'This job already has a pending or running run. Cancel it first.' },
          { status: 409 }
        );
      }

      const { data: run, error: runErr } = await supabase
        .from('scrape_job_runs')
        .insert({
          job_id: id,
          status: 'pending',
          run_params: job.params || {},
          triggered_by: 'manual',
        })
        .select()
        .single();

      if (runErr) throw runErr;

      await logAuditEvent({
        user_id: auth.user.id,
        user_name: auth.user.name,
        action: 'update',
        resource_type: 'scrape_job',
        resource_id: id,
        details: { action: 'trigger_run', runId: run.id },
        ip_address: getClientIP(request),
      });

      return NextResponse.json({
        success: true,
        data: transformRun(run),
        message: 'Run triggered — execute the orchestrator to process it',
      });
    }

    // Update job fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.isActive !== undefined) updates.is_active = updateData.isActive;
    if (updateData.params !== undefined) updates.params = updateData.params;
    if (updateData.scheduleType !== undefined) updates.schedule_type = updateData.scheduleType;
    if (updateData.sourcePlatform !== undefined) updates.source_platform = updateData.sourcePlatform;

    const { data, error } = await supabase
      .from('scrape_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'scrape_job',
      resource_id: id,
      details: { updatedFields: Object.keys(updates) },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true, data: transformJob(data) });
  } catch (error) {
    console.error('Error updating scrape job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scrape job' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scrape-jobs
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'content.delete');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('scrape_jobs').delete().eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'scrape_job',
      resource_id: id,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting scrape job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scrape job' },
      { status: 500 }
    );
  }
}
