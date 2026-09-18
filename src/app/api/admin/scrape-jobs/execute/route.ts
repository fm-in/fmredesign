/**
 * Scrape Jobs Execute API
 * Spawns the Python orchestrator to process pending runs.
 * Only works in local/self-hosted environments (not serverless).
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { requirePermission } from '@/lib/admin-auth-middleware';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const scriptsDir = path.resolve(process.cwd(), '..', 'scripts', 'lead-scraper');
    const pythonBin = path.join(scriptsDir, 'venv', 'bin', 'python');
    const orchestratorPath = path.join(scriptsDir, 'orchestrator.py');

    // Spawn orchestrator detached so it runs in the background
    const child = spawn(pythonBin, [orchestratorPath], {
      cwd: scriptsDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: 'Orchestrator started — processing pending runs',
      pid: child.pid,
    });
  } catch (error) {
    console.error('Error spawning orchestrator:', error);
    return NextResponse.json(
      { success: false, error: `Failed to start orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
