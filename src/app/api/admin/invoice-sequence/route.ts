/**
 * Invoice Sequence API
 *
 * GET  — Preview next invoice number (read-only, no increment)
 * POST — Atomically increment and return the next invoice number
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { ApiResponse } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// GET — preview next number without incrementing
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.read');
  if ('error' in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('invoice_sequences')
      .select('prefix, current_counter, current_year')
      .eq('id', 'default')
      .single();

    if (error) throw error;

    const now = new Date();
    const currentYear = now.getFullYear();
    let counter = data.current_counter;

    // If year has changed, counter would reset to 1 on next POST
    if (data.current_year !== currentYear) {
      counter = 0;
    }

    const next = `${data.prefix}${counter + 1}/${currentYear}`;

    return ApiResponse.success({
      counter: data.current_counter,
      year: data.current_year,
      next,
    });
  } catch (error) {
    console.error('Error fetching invoice sequence:', error);
    return ApiResponse.error('Failed to fetch invoice sequence');
  }
}

// ---------------------------------------------------------------------------
// POST — atomically increment counter and return new invoice number
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'finance.write');
  if ('error' in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Read prefix (rarely changes) — needed regardless of which path increments.
    const { data: seq, error: fetchError } = await supabase
      .from('invoice_sequences')
      .select('prefix, current_counter, current_year')
      .eq('id', 'default')
      .single();

    if (fetchError) throw fetchError;

    // Preferred path: atomic increment via Postgres RPC — single statement,
    // race-safe under concurrent invoice creation. Same RPC used by
    // `auto-invoice.ts`'s scheduled job.
    let newCounter: number | null = null;
    try {
      const { data: rpcCounter, error: rpcError } = await supabase.rpc(
        'increment_invoice_counter',
        { p_year: currentYear },
      );
      if (!rpcError && typeof rpcCounter === 'number') {
        newCounter = rpcCounter;
      }
    } catch {
      // Fall through to legacy path below.
    }

    // Legacy fallback (kept for environments where the RPC is not installed):
    // read-modify-write is non-atomic, but preserves behaviour for those envs.
    if (newCounter === null) {
      const baseCounter = seq.current_year !== currentYear ? 0 : seq.current_counter;
      newCounter = baseCounter + 1;

      const { error: updateError } = await supabase
        .from('invoice_sequences')
        .update({
          current_counter: newCounter,
          current_year: currentYear,
          updated_at: now.toISOString(),
        })
        .eq('id', 'default');

      if (updateError) throw updateError;
    }

    const invoiceNumber = `${seq.prefix}${newCounter}/${currentYear}`;

    return ApiResponse.success({
      invoiceNumber,
      counter: newCounter,
      year: currentYear,
    });
  } catch (error) {
    console.error('Error incrementing invoice sequence:', error);
    return ApiResponse.error('Failed to generate invoice number');
  }
}
