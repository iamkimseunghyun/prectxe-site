import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import React from 'react';

import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import { Metadata } from 'next';

// 메타데이터 설정
export const metadata: Metadata = {
  title: {
    default: 'PRECTXE - Digital Art Platform',
    template: '%s | PRECTXE',
  },
  description:
    '디지털 아트 페스티벌, 전시, 공연을 위한 플랫폼. PRECTXE에서 새로운 예술을 경험하세요.',
  keywords: [
    '디지털아트',
    '전시',
    '공연',
    '페스티벌',
    '워크샵',
    'PRECTXE',
    '프렉티스',
  ],
  authors: [{ name: 'PRECTXE' }],
  creator: 'PRECTXE',
  metadataBase: new URL('https://prectxe.com'), // 실제 도메인으로 변경해주세요
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://prectxe.com',
    title: 'PRECTXE - Digital Art Platform',
    description: '디지털 아트 페스티벌, 전시, 공연을 위한 플랫폼',
    siteName: 'PRECTXE',
    images: [
      {
        url: '/og-image.jpg', // 실제 OG 이미지 경로로 변경해주세요
        width: 1200,
        height: 630,
        alt: 'PRECTXE Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRECTXE - Digital Art Platform',
    description: '디지털 아트 페스티벌, 전시, 공연을 위한 플랫폼',
    images: ['/og-image.jpg'], // 실제 트위터 카드 이미지 경로로 변경해주세요
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code', // 구글 서치 콘솔 인증 코드
    other: {
      'naver-site-verification': 'naver-site-verification-code', // 네이버 서치어드바이저 인증 코드
    },
  },
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
    <html lang="en" className="overflow-y-scroll">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <Header />
        <main className="pt-[var(--header-height)]">
          {children}
          <Toaster />
        </main>
        <Footer />
      </body>
    </html>
  );
}
