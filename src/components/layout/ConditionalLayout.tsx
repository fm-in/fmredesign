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
  // The redesign's foundation preview brings its own SiteShell.
  '/site-preview',
] as const;

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const hasOwnShell = OWN_SHELL_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (hasOwnShell) {
    return <main id="main-content">{children}</main>;
  }

  // One header, one footer, for every public route. The previous V1 import
  // was never rendered, and the V3 branch existed only to serve
  // /showcase/home-v3 — both removed along with the showcase explorations.
  return (
    <>
      <HeaderV2 />
      <main id="main-content">{children}</main>
      <FooterV2 />
    </>
  );
}
