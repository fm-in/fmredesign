/**
 * Google Consent Mode v2, region-based.
 *
 * - EEA, UK and Switzerland: every storage type starts **denied**, and GA runs
 *   cookieless until the visitor presses Accept.
 * - Everywhere else (India is most of our traffic): starts **granted**; the
 *   banner's Decline revokes it.
 *
 * The visitor's choice lives in localStorage under `CONSENT_KEY` and is
 * re-applied by the GTM bootstrap (`gtmBootstrap`) BEFORE the container loads,
 * so a returning visitor who declined is never counted, even for one hit.
 *
 * Client-safe: no server imports.
 */

export const CONSENT_KEY = 'fm-consent';
export type ConsentChoice = 'granted' | 'denied';

/** EEA member states + UK + Switzerland, as ISO 3166-1 alpha-2 codes. */
export const CONSENT_REQUIRED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
  'SK', 'SI', 'ES', 'SE', 'GB', 'CH',
] as const;

export function consentState(choice: ConsentChoice) {
  return {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  };
}

export function readConsent(store: Pick<Storage, 'getItem'>): ConsentChoice | null {
  const value = store.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

/** Saves the choice and tells GTM immediately, so it applies to this page view. */
export function saveConsent(store: Pick<Storage, 'setItem'>, choice: ConsentChoice): void {
  store.setItem(CONSENT_KEY, choice);
  if (typeof window === 'undefined') return;
  const layer = (window.dataLayer = window.dataLayer || []);
  // gtag's consent commands must be pushed as an `arguments` object, not an
  // array — GTM ignores the array form. Hence the function rather than a
  // plain push.
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments as unknown as Record<string, unknown>);
  } as (...args: unknown[]) => void;
  gtag('consent', 'update', consentState(choice));
}

/**
 * The inline script that must run before anything else analytics-related:
 * consent defaults, the stored choice, then the standard GTM loader.
 *
 * One script rather than several `<Script>` tags because Next.js does not
 * guarantee the order in which separate inline scripts execute, and consent
 * set after GTM has fired its first tags is consent set too late.
 */
export function gtmBootstrap(containerId: string): string {
  const denied = JSON.stringify({ ...consentState('denied'), region: CONSENT_REQUIRED_REGIONS, wait_for_update: 500 });
  const granted = JSON.stringify(consentState('granted'));
  return [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}',
    `gtag('consent','default',${denied});`,
    `gtag('consent','default',${granted});`,
    // Stored choice, re-applied before GTM. Wrapped: storage can throw.
    `try{var c=localStorage.getItem(${JSON.stringify(CONSENT_KEY)});`,
    `if(c==='granted'||c==='denied'){gtag('consent','update',{ad_storage:c,ad_user_data:c,ad_personalization:c,analytics_storage:c});}}catch(e){}`,
    // Standard GTM loader.
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});`,
    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';`,
    `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);`,
    `})(window,document,'script','dataLayer',${JSON.stringify(containerId)});`,
  ].join('');
}

/** GTM container ids look like GTM-XXXXXXX. Anything else is a typo in the env var. */
export function isValidContainerId(id: string | undefined): id is string {
  return typeof id === 'string' && /^GTM-[A-Z0-9]{4,12}$/.test(id);
}
