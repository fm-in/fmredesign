/**
 * What we can honestly derive from someone's country, and what we cannot.
 *
 * The application used to ask for city, state, country, currency and a bare
 * phone number as five separate questions. Four of those are answerable from
 * one, and the fifth is better asked later.
 *
 * City is deliberately NOT derived. Vercel does hand us `x-vercel-ip-city`,
 * but that is the city of the IP: on mobile networks and VPNs it is routinely
 * the gateway's city, often hundreds of kilometres out. A wrong city nobody
 * notices is worse than no city, because location is exactly what a client
 * filters the pool on. It is collected in the portal instead, where the
 * person is looking at their own profile and will correct it.
 */

export interface CountryLocale {
  code: string;
  name: string;
  /** International dialling prefix, with the plus. */
  dialCode: string;
  /** Matches a code in `CURRENCIES`. */
  currency: string;
  symbol: string;
}

/**
 * The countries worth spelling out. Everywhere else falls back to a generic
 * entry rather than being refused — someone in Kenya or Chile is still welcome
 * to apply, and guessing their currency wrongly would be worse than asking.
 */
export const COUNTRIES: readonly CountryLocale[] = [
  { code: 'IN', name: 'India', dialCode: '+91', currency: 'INR', symbol: '₹' },
  { code: 'US', name: 'United States', dialCode: '+1', currency: 'USD', symbol: '$' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', currency: 'GBP', symbol: '£' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', currency: 'USD', symbol: '$' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', currency: 'USD', symbol: '$' },
  { code: 'AU', name: 'Australia', dialCode: '+61', currency: 'USD', symbol: '$' },
  { code: 'CA', name: 'Canada', dialCode: '+1', currency: 'USD', symbol: '$' },
  { code: 'DE', name: 'Germany', dialCode: '+49', currency: 'EUR', symbol: '€' },
  { code: 'FR', name: 'France', dialCode: '+33', currency: 'EUR', symbol: '€' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', currency: 'EUR', symbol: '€' },
];

/** Most applicants are Indian; a header we cannot read should not change that. */
export const DEFAULT_COUNTRY = 'IN';

export function localeFor(countryCode: string | null | undefined): CountryLocale {
  const code = (countryCode ?? '').toUpperCase();
  return (
    COUNTRIES.find((c) => c.code === code) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)!
  );
}

/**
 * Read the country Vercel attached to the request.
 *
 * Only ever a starting guess: it is shown in an editable field, never stored
 * without the person having had the chance to correct it. A VPN, a roaming
 * SIM or a corporate proxy all produce the wrong answer, and none of them
 * should cost someone the right currency.
 */
export function countryFromHeaders(headers: Headers): string {
  const country = headers.get('x-vercel-ip-country');
  if (!country) return DEFAULT_COUNTRY;
  const code = country.toUpperCase();
  return COUNTRIES.some((c) => c.code === code) ? code : DEFAULT_COUNTRY;
}
