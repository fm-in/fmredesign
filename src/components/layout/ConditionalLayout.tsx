'use client';

import { usePathname } from "next/navigation";
import { HeaderV2 } from "@/components/layout/HeaderV2";
import { FooterV2 } from "@/components/layout/FooterV2";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') || false;
  const isClientRoute = pathname?.startsWith('/client') || false;

  if (isAdminRoute || isClientRoute) {
    // Admin and client routes render without the marketing header/footer
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
