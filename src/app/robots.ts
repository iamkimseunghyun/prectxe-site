import type { MetadataRoute } from 'next';
import { BUSINESS_INFO } from '@/lib/constants/business-info';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/*', '/admin/*', '/auth/*', '/*/edit', '/*/new'],
    },
    sitemap: `${BUSINESS_INFO.serviceUrl}/sitemap.xml`,
  };
}
