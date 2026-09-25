import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WebVitals } from "@/components/WebVitals";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { AttributionCapture } from "@/components/AttributionCapture";
import Script from "next/script";
import { SITE_URL } from '@/lib/site-url';
import { THEME_INIT_SCRIPT } from '@/components/site/theme';
import { COMPANY_PHONE_E164 } from '@/lib/company';
import { ContactClickTracker } from '@/components/analytics/ContactClickTracker';
import { gtmBootstrap, isValidContainerId } from '@/lib/analytics/consent';

const GTM_ID = isValidContainerId(process.env.NEXT_PUBLIC_GTM_ID) ? process.env.NEXT_PUBLIC_GTM_ID : null;

/*
 * Playfair and Plus Jakarta are the portals' faces (admin, client, talent).
 * `preload: false` because the root layout wraps public pages too: preloaded,
 * every public visitor downloaded two families no public text uses. Unpreloaded,
 * a browser fetches a face only when text on the page actually needs it, so
 * public pages never do and portal pages still get them, just not early.
 */
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "600", "700", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  // "300" dropped — `font-light` has zero usages across src/.
  weight: ["400", "500", "600", "700"],
});

/*
 * Instrument Serif — the redesign's display face, and still the old system's
 * accent face. `globals.css` aliases `--font-accent` to this so the existing
 * `.font-accent` utility keeps working until Phase 9 removes it.
 */
const instrument = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

/*
 * DM Sans — the redesign's text face. Paired with Instrument Serif: a high
 * contrast display serif against a low-contrast geometric sans is the pairing
 * the direction was approved on.
 *
 * Variable font, so one request covers 400–700 rather than the four static
 * cuts Plus Jakarta ships.
 */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    // '/' is correct for the home page ONLY because this object is also the
    // default for every page that does not set its own. A page that forgets
    // to override it silently tells Google it IS the home page — /academy did
    // exactly that. Any new route must declare its own alternates.canonical.
    canonical: '/',
  },
  title: {
    default: "Creative Marketing Agency in Bhopal | Freaking Minds",
    template: "%s | Freaking Minds",
  },
  description: "Full-service creative marketing agency in Bhopal. Strategy, design and performance marketing that turns ambitious brands into market leaders.",
  keywords: [
    "creative marketing agency",
    "full-service marketing agency",
    "brand strategy agency",
    "performance marketing",
    "creative design agency",
    "marketing strategy consulting"
  ],
  authors: [{ name: "Freaking Minds" }],
  creator: "Freaking Minds",
  publisher: "Freaking Minds",
  icons: {
    icon: [
      { url:"/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url:"/favicon.png", sizes: "192x192", type: "image/png" },
    ],
    apple:"/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: "Freaking Minds - Creative Marketing Agency",
    description: "Full-service creative marketing agency. Strategy, design, and performance under one roof.",
    siteName: "Freaking Minds",
    images: [
      {
        url:"/og-image.png",
        width: 1200,
        height: 630,
        alt: "Freaking Minds - Creative Marketing Agency",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@freakingminds",
    title: "Freaking Minds - Creative Marketing Agency",
    description: "Full-service creative marketing. Strategy, design, and performance under one roof.",
    images: [
      {
        url:"/og-image.png",
        width: 1200,
        height: 630,
        alt: "Freaking Minds - Creative Marketing Agency",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "facebook-domain-verification": "xiphsre5jv2g5mdb452vtwos8vysba",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Freaking Minds',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
        },
        sameAs: [
          'https://www.instagram.com/freakingminds/',
          'https://www.linkedin.com/company/freakingminds/',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: COMPANY_PHONE_E164,
          contactType: 'customer service',
          email: 'freakingmindsdigital@gmail.com',
          areaServed: 'Worldwide',
          availableLanguage: ['English', 'Hindi'],
        },
      },
      {
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/#localbusiness`,
        name: 'Freaking Minds',
        description: 'Full-service creative marketing agency. Strategy, design, and performance marketing that transforms ambitious brands into market leaders.',
        url: SITE_URL,
        telephone: COMPANY_PHONE_E164,
        email: 'freakingmindsdigital@gmail.com',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bhopal',
          addressRegion: 'Madhya Pradesh',
          addressCountry: 'IN',
        },
        priceRange: '$$',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '09:00',
          closes: '18:00',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Freaking Minds',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/freakquency?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/#breadcrumb`,
        itemListElement: [
          // `position` is an ordinal, not a depth marker. Every entry after Home
          // was previously `position: 2`, which makes the list invalid.
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
          { '@type': 'ListItem', position: 3, name: 'Work', item: `${SITE_URL}/work` },
          { '@type': 'ListItem', position: 4, name: 'About', item: `${SITE_URL}/about` },
          { '@type': 'ListItem', position: 5, name: 'FM Academy', item: `${SITE_URL}/academy` },
          { '@type': 'ListItem', position: 6, name: 'Freakquency', item: `${SITE_URL}/freakquency` },
          { '@type': 'ListItem', position: 7, name: 'Contact', item: `${SITE_URL}/contact` },
        ],
      },
    ],
  };

  /*
   * `suppressHydrationWarning` on <html> is required here, not optional: the
   * theme script in <head> deliberately writes `data-theme` onto this element
   * before React hydrates, so the server's HTML and the client's DOM differ
   * by design. Without it, every dark-mode visitor got a hydration mismatch
   * logged against the root element on every page load. It suppresses the
   * warning for this element's own attributes only — children still checked.
   */
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${jakarta.variable} ${instrument.variable} ${dmSans.variable}`}
    >
      <head>
        {/*
          Applies the stored theme before first paint. Without it the page
          paints bone, hydrates, then swaps to ink — a full-screen flash on
          every navigation for anyone who chose dark.

          Deliberately a blocking inline script rather than next/script: it
          must run before the first stylesheet-dependent paint, which is
          exactly what every `strategy` option avoids.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/*
          Warm up the third-party origins before the scripts below are
          requested. Lighthouse measured ~349ms of connection setup on mobile
          that these remove from the critical path.
        */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://cal.com" />
        <link rel="dns-prefetch" href="https://observatory.goodmantech.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded"
          style={{ background: 'var(--site-text, #111)', color: 'var(--site-ground, #fff)', fontFamily: 'var(--site-font-sans, system-ui)' }}
        >
          Skip to main content
        </a>
        <QueryProvider>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </QueryProvider>
        <WebVitals />
        <CookieConsent />
        <ChatbotWidget />

        {/*
          Third-party scripts run after hydration instead of from <head>.
          In <head> they were fetched in parallel with the hero image and
          competed for bandwidth on throttled mobile connections; GTM alone is
          the single largest resource on the page (166 KB).

          - Tag Manager: `afterInteractive` — the Next.js-recommended strategy
            for analytics. Still fires on every page view, just not before paint.
          - cal.com: `lazyOnload` — not used on the homepage at all, and
            `CalButton` already falls back to opening cal.com in a new tab
            when the embed has not loaded yet.
          - Observatory pixel: `lazyOnload` — passive telemetry.
        */}
        {/*
          Google Tag Manager, with Consent Mode defaults and the visitor's
          stored choice applied in the same script, before the container
          loads (see src/lib/analytics/consent.ts). GA4 itself is configured
          inside the container — docs/analytics/TRACKING.md. Without a valid
          NEXT_PUBLIC_GTM_ID nothing loads: local dev sends no hits, and
          neither do Vercel previews while the variable is scoped to
          Production.
        */}
        {GTM_ID && (
          <Script id="gtm" strategy="afterInteractive">
            {gtmBootstrap(GTM_ID)}
          </Script>
        )}
        {/*
          Cal.com's embed expects its queueing stub to define window.Cal before
          embed.js loads; loading embed.js on its own is what threw
          "Cal is not defined" on every page. The stub loads embed.js itself.
        */}
        <Script id="cal-embed" strategy="lazyOnload">
          {`(function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://cal.com/embed/embed.js", "init"); Cal("init", { origin: "https://cal.com" }); Cal("on", { action: "bookingSuccessfulV2", callback: function () { var l = window.dataLayer = window.dataLayer || []; l.push({ ecommerce: null }); l.push({ event: "book_call" }); } });`}
        </Script>
        <AttributionCapture />
        <ContactClickTracker />
        <Script
          id="observatory-pixel"
          src="https://observatory.goodmantech.co/api/pixel/proj_freaking-minds_misvd05m"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

