/**
 * Inngest: scheduled feed ingestion for the resources hub.
 *
 * Runs on Inngest rather than GitHub Actions — the reference implementation
 * this borrows from used Actions, but that was its constraint, not a
 * preference. This project already runs auto-invoice on an Inngest cron, so
 * reusing it means retries, observability and no second scheduling surface or
 * set of deployment secrets.
 */

import { inngest } from '../client';

export const scrapeResourcesCron = inngest.createFunction(
  {
    id: 'scrape-resources-cron',
    // One retry only. The next run is two hours away and picks up anything
    // missed — hammering a publisher that just rejected us is worse than
    // waiting, and upserts on source_url make a re-run idempotent.
    retries: 1,
  },
  { cron: '15 */2 * * *' }, // every 2 hours, offset off the hour
  async ({ step }) => {
    const report = await step.run('ingest-feeds', async () => {
      const { ingestFeeds } = await import('@/lib/resources/ingest');
      return ingestFeeds({ dryRun: false });
    });

    // Surface dead feeds in the run log. A feed that stops answering is the
    // characteristic silent failure here: the hub keeps working with less and
    // less in it, and nobody notices for months.
    const broken = report.feeds.filter((f) => !f.ok);
    if (broken.length) {
      console.warn(
        '[scrape-resources] feeds failed:',
        broken.map((f) => `${f.feedId} (${f.error})`).join(', ')
      );
    }

    return {
      fetched: report.totals.fetched,
      kept: report.totals.kept,
      dropped: report.totals.dropped,
      failedFeeds: broken.map((f) => f.feedId),
    };
  }
);
