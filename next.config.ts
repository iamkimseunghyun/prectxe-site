import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 전체 리소스 CSP — 우선 Report-Only로 배포해 위반을 관찰한 뒤 강제(enforce)로 승격.
// origin 출처: GA(googletagmanager/analytics), Cloudflare Images(imagedelivery),
// Cloudflare Stream(cloudflarestream/videodelivery), YouTube 임베드, PortOne(결제 dormant).
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.portone.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://imagedelivery.net https://*.cloudflarestream.com https://i.ytimg.com https://www.google-analytics.com https://www.googletagmanager.com https://avatars.githubusercontent.com https://assets.zyrosite.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.portone.io https://*.cloudflarestream.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "media-src 'self' blob: https://*.cloudflarestream.com https://videodelivery.net",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.cloudflarestream.com https://*.portone.io",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

// 강제(enforce)하는 헤더 — 리소스 로딩에 영향 없는 안전한 항목만.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
  // 카메라는 QR 입장 스캐너(/admin/drops/[id]/scanner)에서 필요 → self 허용
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
  },
  // 클릭재킹·base 태그 주입·플러그인 차단(리소스 로딩 영향 없는 지시문만 강제)
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  // 전체 리소스 정책은 관찰 모드 — 위반 0 확인 후 enforce로 승격
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
];

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
