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
