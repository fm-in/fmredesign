'use client';

import { usePathname } from "next/navigation";
import { HeaderV2 } from "@/components/layout/HeaderV2";
import { FooterV2 } from "@/components/layout/FooterV2";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

/**
 * Routes that bring their own shell and must NOT be wrapped in the marketing
 * header and footer.
 *
 * The talent portal renders a full `DashboardLayout`, the two login screens
 * render full-bleed panels, and `/talent/[slug]` is a signed-in-ish profile
 * page — none of them are marketing surfaces, and all four were previously
 * rendering inside the public chrome. Keeping this list explicit is what lets
 * the public site be restyled without touching any portal.
 */
const OWN_SHELL_PREFIXES = [
  '/admin',
  '/client',
  '/creativeminds/portal',
  '/creativeminds/login',
  '/talent/',
] as const;

/**
 * Routes already migrated to the new design system.
 *
 * They render `SiteShell` + `SiteHeader` + `SiteFooter` themselves, so the old
 * chrome must not wrap them. This list grows one route at a time; when it
 * covers every public route, this whole component — along with `HeaderV2` and
 * `FooterV2` — is deleted.
 *
 * Exact matches, not prefixes: `/work` migrating must not silently take
 * `/work/[slug]` with it.
 */
const MIGRATED_ROUTES: readonly string[] = [
  '/',
  '/about',
  '/work',
  '/privacy',
  '/terms',
  '/services',
  '/freakquency',
  '/scorecard',
  '/contact',
  '/get-started',
  '/academy',
  '/creativeminds',
  '/unsubscribe',
];

/** Prefixes that behave like migrated routes — they render `SiteShell`. */
const MIGRATED_PREFIXES: readonly string[] = [
  '/site-preview',
  // Dynamic segments. `/creativeminds` is NOT a prefix here: `/creativeminds/login`
  // and `/creativeminds/portal` bring their own shells and are matched above.
  '/academy/',
  '/freakquency/',
];

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // A migrated route renders its own <main id="main-content"> inside SiteShell,
  // so wrapping it here would nest one landmark inside another.
  if (
    MIGRATED_ROUTES.includes(pathname ?? '') ||
    MIGRATED_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  ) {
    return <>{children}</>;
  }

  // A portal route has its own chrome but no landmark of its own, so it still
  // needs the <main> wrapper — the skip link and screen readers depend on it.
  if (OWN_SHELL_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return <main id="main-content">{children}</main>;
  }

  // One header, one footer, for every public route not yet migrated.
  return (
    <>
      <HeaderV2 />
      <main id="main-content">{children}</main>
      <FooterV2 />
    </>
  );
}
