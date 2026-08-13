import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'inngest'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  /**
   * Keep every *.vercel.app host out of the index.
   *
   * fmredesign-omega.vercel.app serves production and returned HTTP 200 with
   * no X-Robots-Tag, so nothing prevented Google indexing a second complete
   * copy of the site. Its canonical tag pointed at the apex, which itself
   * redirects — a weak signal to rely on for de-duplication.
   *
   * This also covers preview deployments, which should never be indexed
   * either, while leaving them fully reachable for testing.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(.*)\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy URLs from previous website (Google-indexed)
      { source: '/career', destination: '/creativeminds', permanent: true },
      { source: '/connect', destination: '/contact', permanent: true },
      { source: '/know-us', destination: '/about', permanent: true },
      // FM Academy — old single-program slug replaced by multi-course listing
      { source: '/academy/freaking-minds-creator-program', destination: '/academy', permanent: false },
    ];
  },
};

export default nextConfig;
