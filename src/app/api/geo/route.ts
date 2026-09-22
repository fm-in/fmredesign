/**
 * The country Vercel attached to this request.
 *
 * Only a starting guess for the application form, which shows it in an
 * editable field. A VPN, a roaming SIM or a corporate proxy all produce the
 * wrong answer, and none of them should cost someone the right currency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { countryFromHeaders } from '@/lib/talent/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({ country: countryFromHeaders(request.headers) });
}
