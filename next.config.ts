import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'inngest'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
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
