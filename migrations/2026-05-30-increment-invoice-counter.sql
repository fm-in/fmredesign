-- ============================================================================
-- Atomic Invoice Counter RPC
-- Apply via Supabase SQL editor or psql.
--
-- WHY: Both the manual invoice-sequence POST and the auto-invoice cron rely
-- on `increment_invoice_counter` to bump the counter atomically. The
-- function does NOT currently exist in this project's schema; both code
-- paths fall back to a read-then-update sequence that is NOT race-safe.
-- Concurrent invoice creation can therefore mint duplicate FM<n>/<year>
-- numbers, which is a hard problem under Indian GST (every invoice number
-- must be unique within a financial year).
--
-- Once this RPC exists, both call sites will take the atomic path and the
-- race is genuinely closed without further code changes.
--
-- WHAT: `increment_invoice_counter(p_year integer) returns integer`
--  - Upserts the singleton row in `invoice_sequences` keyed `id = 'default'`
--  - If `current_year = p_year`: increments `current_counter`
--  - If `current_year != p_year`: resets `current_counter` to 1
--  - Returns the new counter value
--
-- The whole operation runs in a single statement so PostgreSQL row-level
-- locking makes it safe under any level of concurrency.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_invoice_counter(p_year integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_counter integer;
BEGIN
  INSERT INTO public.invoice_sequences (id, prefix, current_year, current_counter, updated_at)
  VALUES ('default', 'FM', p_year, 1, NOW())
  ON CONFLICT (id) DO UPDATE
    SET
      current_counter = CASE
        WHEN public.invoice_sequences.current_year = p_year
          THEN public.invoice_sequences.current_counter + 1
        ELSE 1
      END,
      current_year = p_year,
      updated_at = NOW()
  RETURNING current_counter INTO v_new_counter;

  RETURN v_new_counter;
END;
$$;

-- Smoke-test (safe — increments by 1; verify the row in invoice_sequences):
-- SELECT public.increment_invoice_counter(EXTRACT(year FROM NOW())::integer);
-- SELECT * FROM public.invoice_sequences WHERE id = 'default';
