/**
 * Theme resolution for the public site.
 *
 * Light is the default and the first impression: `prefers-color-scheme` is
 * deliberately NOT consulted. A visitor whose OS is dark still sees bone paper
 * until they choose otherwise.
 */

export type SiteTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fm-site-theme';
export const THEME_ATTRIBUTE = 'data-theme';

export function isSiteTheme(value: unknown): value is SiteTheme {
  return value === 'light' || value === 'dark';
}

/**
 * Read the stored preference. Returns 'light' when nothing is stored, when
 * the stored value is junk, or when storage throws — a private window and a
 * blocked-cookies browser both throw on access, and neither should break the
 * page.
 */
export function readStoredTheme(): SiteTheme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isSiteTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function storeTheme(theme: SiteTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preference simply does not persist. Not worth failing a click over.
  }
}

/** Light carries no attribute at all, so the default CSS path needs no override. */
export function applyTheme(theme: SiteTheme, root: HTMLElement): void {
  if (theme === 'dark') {
    root.setAttribute(THEME_ATTRIBUTE, 'dark');
  } else {
    root.removeAttribute(THEME_ATTRIBUTE);
  }
}

/**
 * Runs before first paint, inlined into the document head.
 *
 * Without this the page paints bone, then React hydrates and swaps to ink —
 * a full-screen flash on every navigation for anyone who chose dark. It is a
 * string rather than a function because it must execute as a blocking script
 * before any stylesheet-dependent paint.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='dark'){document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},'dark')}}catch(e){}})();`;
