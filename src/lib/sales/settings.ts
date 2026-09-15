/** Sales settings live in `admin_settings.sales` (row id "global"). */

import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_BOOKING_LINK } from '@/lib/sales/links';
import type { SalesSettings } from '@/lib/sales/types';

const SETTINGS_ID = 'global';

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  automationEnabled: false,
  bookingLink: DEFAULT_BOOKING_LINK,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Anything other than an explicit `true` leaves automation off. */
export function parseSalesSettings(raw: unknown): SalesSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SALES_SETTINGS };
  const bookingLink = typeof raw.bookingLink === 'string' ? raw.bookingLink.trim() : '';
  return {
    automationEnabled: raw.automationEnabled === true,
    bookingLink: bookingLink || DEFAULT_SALES_SETTINGS.bookingLink,
  };
}

export async function getSalesSettings(): Promise<SalesSettings> {
  const { data, error } = await getSupabaseAdmin().from('admin_settings').select('sales').eq('id', SETTINGS_ID).maybeSingle();
  if (error || !data) return { ...DEFAULT_SALES_SETTINGS };
  return parseSalesSettings(data.sales);
}

export async function updateSalesSettings(patch: Partial<SalesSettings>): Promise<SalesSettings> {
  const next = parseSalesSettings({ ...(await getSalesSettings()), ...patch });
  const { error } = await getSupabaseAdmin()
    .from('admin_settings')
    .upsert({ id: SETTINGS_ID, sales: next, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
  return next;
}
