import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import React from 'react';

import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import { Metadata } from 'next';

// 메타데이터 설정
export const metadata: Metadata = {
  metadataBase: new URL('https://prectxe.com'),
  title: {
    default: 'PRECTXE',
    template: '%s | PRECTXE',
  },
  description: 'Digital Art Platform for Artists and Art Lovers',
  keywords: ['digital art', 'art platform', 'artists', 'exhibitions', 'events'],
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
    title: 'PRECTXE',
    description: 'Digital Art Platform for Artists and Art Lovers',
    siteName: 'PRECTXE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRECTXE',
    description: 'Digital Art Platform for Artists and Art Lovers',
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
