import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import React from 'react';

import { Footer } from '@/components/layout/footer';

import Header from '@/components/layout/header';
import { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/modules/providers';

// 메타데이터 설정
export const metadata: Metadata = {
  metadataBase: new URL('https://prectxe.com'),
  title: {
    default: '프렉티스 | 디지털 아트 플랫폼',
    template: '%s | 프렉티스',
  },
  description:
    '작가와 관객을 위한 디지털 아트 플랫폼, 프렉티스에서 새로운 예술을 만나보세요',
  keywords: [
    '디지털 아트',
    '예술 플랫폼',
    '아티스트',
    '전시',
    '공연',
    '이벤트',
  ],
  authors: [{ name: 'PRECTXE' }],
  creator: 'PRECTXE',
  publisher: 'PRECTXE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://prectxe.com',
    title: '프렉티스 | 디지털 아트 플랫폼',
    description:
      '전시, 공연, 디지털 아트를 한 곳에서 만나보세요. 작가와 관객이 함께 만들어가는 새로운 예술 플랫폼, 프렉티스',
    siteName: '프렉티스',
    images: [
      {
        url: '/twitter-card.jpg', // metadataBase와 결합되어 https://prectxe.com/twitter-card.jpg가 됨
        width: 1200,
        height: 630,
        alt: '프렉티스 디지털 아트 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '프렉티스 | 디지털 아트 플랫폼',
    description:
      '전시, 공연, 디지털 아트를 한 곳에서 만나보세요. 작가와 관객이 함께 만들어가는 새로운 예술 플랫폼, 프렉티스',
    images: [
      {
        url: '/twitter-card.jpg', // metadataBase와 결합되어 https://prectxe.com/twitter-card.jpg가 됨
        width: 1200,
        height: 630,
        alt: '프렉티스 디지털 아트 플랫폼',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  other: {
    'naver-site-verification': '300199d0d8d13b5cec4510cd23ec7f007e7e9f56',
  },
};

// viewport는 별도로 export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="overflow-y-scroll">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <Providers>
          <Header />
          <main className="pt-[var(--header-height)]">
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
