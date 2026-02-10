import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Server-only packages (Node.js modules)
  serverExternalPackages: ['aligoapi', 'solapi'],

  images: {
    unoptimized: true,
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: 'assets.zyrosite.com',
      },
      // 개발 환경용
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp'],
  },
  async redirects() {
    if (process.env.ENABLE_PROGRAM_REDIRECTS !== '1') return [];
    return [
      // Legacy to new program detail by slug
      {
        source: '/projects/:slug',
        destination: '/programs/:slug',
        permanent: true,
      },
      {
        source: '/events/:slug',
        destination: '/programs/:slug',
        permanent: true,
      },
      // Merge Discover/Archive into Programs
      {
        source: '/discover',
        destination: '/programs?status=upcoming',
        permanent: true,
      },
      {
        source: '/archive',
        destination: '/programs?status=completed',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
