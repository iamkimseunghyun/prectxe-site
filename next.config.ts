import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  images: {
    unoptimized: true,
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
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
