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
    // One retry only. The next run is a day away, so a failure costs more than it
    // used to — hammering a publisher that just rejected us is worse than
    // waiting, and upserts on source_url make a re-run idempotent.
    retries: 1,
  },
  // 01:45 UTC = 07:15 IST — the day's news is in place before anyone opens
  // the page, and it is well clear of the 03:30 UTC auto-invoice cron.
  //
  // ONE KNOWN COST: MediaNews4U publishes roughly fifteen items a day into a
  // feed that carries only ten, so a once-daily fetch drops whatever rolled
  // off in between. Every other feed carries far more than it publishes in a
  // day and loses nothing. Move to '45 1,13 * * *' if that source turns out
  // to matter — it is a one-line change.
  { cron: '45 1 * * *' },
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
