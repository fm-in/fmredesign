/**
 * POST /api/admin/resources/scrape — run feed ingestion on demand.
 *
 * Exists mainly for `{ "dryRun": true }`: it fetches and scores every active
 * feed and reports exactly what would be kept and dropped, and why, without
 * writing anything. Run a config change through this before committing it —
 * the alternative is discovering that a threshold tweak silently emptied the
 * hub two hours later.
 *
 * There is no TypeScript script runner in this project, so this route is the
 * tuning tool rather than a CLI script.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import { ingestFeeds } from '@/lib/resources/ingest';

export const dynamic = 'force-dynamic';
// Seventeen feeds fetched sequentially will not finish inside the default.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  let dryRun = true; // Safe default: an empty body must not write.
  try {
    const body = await request.json();
    if (typeof body?.dryRun === 'boolean') dryRun = body.dryRun;
  } catch {
    // No body — keep the dry-run default.
  }

  try {
    const report = await ingestFeeds({ dryRun });
    return ApiResponse.success(report);
  } catch (err) {
    console.error('[admin/resources/scrape] failed:', err);
    return ApiResponse.error(
      err instanceof Error ? err.message : 'Ingestion failed'
    );
  }
}
