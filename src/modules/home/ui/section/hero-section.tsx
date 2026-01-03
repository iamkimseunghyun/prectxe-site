// components/hero-section.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">
              Feed‑first Discovery
            </h1>
            <p className="mt-3 max-w-xl text-base text-neutral-600 md:text-lg">
              Next Up 중심의 간결한 탐색. 전시, 라이브, 파티를 빠르게
              확인하세요.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/programs?status=upcoming">
                <Button size="lg">발견하기</Button>
              </Link>
              <Link href="/programs?status=completed">
                <Button variant="outline" size="lg">
                  아카이브
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl border bg-neutral-100 sm:block">
            <Image
              src="/images/placeholder.png"
              alt="PRECTXE hero visual"
              fill
              priority
              sizes="(min-width: 1024px) 600px, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
