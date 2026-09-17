import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WebVitals } from "@/components/WebVitals";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import Script from "next/script";
import { SITE_URL } from '@/lib/site-url';

// Display font - elegant serif for headlines (authority & sophistication)
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "900"],
});

// Body font - modern, highly readable sans
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  // "300" dropped — `font-light` has zero usages across src/.
  weight: ["400", "500", "600", "700"],
});

// Accent font - for special moments
const instrument = Instrument_Serif({
  variable: "--font-accent",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
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
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
        url: "/og-image.png",
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
        url: "/og-image.png",
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
          telephone: '+91-9833257659',
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
        telephone: '+91-9833257659',
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
          target: `${SITE_URL}/blog?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
          { '@type': 'ListItem', position: 2, name: 'Work', item: `${SITE_URL}/work` },
          { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact` },
        ],
      },
    ],
  };

  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${instrument.variable}`}>
      <head>
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <QueryProvider>
          <SmoothScrollProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
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

          - Analytics: `afterInteractive` — the Next.js-recommended strategy
            for GA. Still fires on every page view, just not before paint.
          - cal.com: `lazyOnload` — not used on the homepage at all, and
            `CalButton` already falls back to opening cal.com in a new tab
            when the embed has not loaded yet.
          - Observatory pixel: `lazyOnload` — passive telemetry.
        */}
        <Script
          id="ga-lib"
          src="https://www.googletagmanager.com/gtag/js?id=G-WRBTEE11SH"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-WRBTEE11SH');`}
        </Script>
        <Script
          id="cal-embed"
          src="https://cal.com/embed/embed.js"
          strategy="lazyOnload"
        />
        <Script
          id="observatory-pixel"
          src="https://observatory.goodmantech.co/api/pixel/proj_freaking-minds_misvd05m"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

