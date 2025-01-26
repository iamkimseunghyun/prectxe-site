import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import React from 'react';

import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'PRECTXE - Digital Art Festival',
    template: '%s | PRECTXE',
  },
  description:
    'PRECTXE is a digital art festival combining online and offline experiences',
  keywords: ['digital art', 'festival', 'art', 'performance', 'workshop'],
  authors: [{ name: 'PRECTXE' }],
  openGraph: {
    title: 'PRECTXE - Digital Art Festival',
    description: 'Experience digital art through performances and workshops',
    url: 'https://prectxe-demo-site.vercel.app',
    siteName: 'PRECTXE',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRECTXE - Digital Art Festival',
    description: 'Experience digital art through performances and workshops',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-y-scroll">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen w-screen max-w-full flex-col antialiased`}
      >
        <Header />
        <main className="flex-1 pt-[var(--header-height)]">
          {children}
          <Toaster />
        </main>
        <Footer />
      </body>
    </html>
  );
}
