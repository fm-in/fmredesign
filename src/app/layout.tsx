import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WebVitals } from "@/components/WebVitals";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatbotWidget } from "@/components/ChatbotWidget";

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
  weight: ["300", "400", "500", "600", "700"],
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
  metadataBase: new URL('https://freakingminds.in'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: "Freaking Minds - Creative Marketing Agency | Strategy. Design. Growth.",
    template: "%s | Freaking Minds",
  },
  description: "Full-service creative marketing agency. Strategy, design, and performance marketing that transforms ambitious brands into market leaders.",
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
    url: "https://freakingminds.in",
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
        '@id': 'https://freakingminds.in/#organization',
        name: 'Freaking Minds',
        url: 'https://freakingminds.in',
        logo: {
          '@type': 'ImageObject',
          url: 'https://freakingminds.in/logo.png',
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
        '@id': 'https://freakingminds.in/#localbusiness',
        name: 'Freaking Minds',
        description: 'Full-service creative marketing agency. Strategy, design, and performance marketing that transforms ambitious brands into market leaders.',
        url: 'https://freakingminds.in',
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
        '@id': 'https://freakingminds.in/#website',
        url: 'https://freakingminds.in',
        name: 'Freaking Minds',
        publisher: { '@id': 'https://freakingminds.in/#organization' },
      },
    ],
  };

  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${instrument.variable}`}>
      <head>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-WRBTEE11SH"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-WRBTEE11SH');`,
          }}
        />
        <script
          async
          src="https://cal.com/embed/embed.js"
        />
        <script
          src="https://observatory.goodmantech.co/api/pixel/proj_freaking-minds_misvd05m"
          async
        />
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
      </body>
    </html>
  );
}

