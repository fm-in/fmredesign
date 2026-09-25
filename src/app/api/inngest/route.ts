/**
 * Inngest API Route Handler
 * Single endpoint for Inngest to discover and invoke functions.
 * Supports: GET (introspection), POST (invoke), PUT (register)
 */

import { serve } from 'inngest/next';
import { inngest, allFunctions } from '@/lib/inngest';

// Inngest invokes each step through this route, so the longest step sets the
// limit. The resource scrape walks 17 feeds in one step — the admin scrape
// route needs 300s for the same work, and on the platform default the run
// times out and is retried until it gives up.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
