// components/hero-section.tsx
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import React from 'react';

const text = `PRECTXE`;

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function HeroSection() {
  return (
    <section className="relative flex h-screen items-center overflow-hidden bg-gradient-to-b from-white to-gray-50 sm:h-[70dvh]">
      {/* 배경 블롭 효과 */}
      <div className="absolute inset-0 h-full w-full">
        <div className="blob absolute left-10 top-20 h-96 w-96 rounded-full bg-purple-400 opacity-70 blur-2xl" />
        {/* 크기 증가, blur 감소 */}
        <div className="blob-delay-2 absolute right-10 top-40 h-96 w-96 rounded-full bg-blue-400 opacity-70 blur-2xl" />
        <div className="blob-delay-4 absolute -bottom-8 left-20 h-96 w-96 rounded-full bg-pink-400 opacity-70 blur-2xl" />
      </div>

      <div className="container relative mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.2,
                  },
                },
              }}
              className="text-6xl font-bold tracking-tight md:text-7xl"
            >
              {text.split('').map((letter, index) => (
                <motion.span
                  key={index}
                  variants={staggerVariants}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
                >
                  {letter}
                </motion.span>
              ))}
            </motion.h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <p className="text-xl text-gray-600 md:text-2xl">
              기술로 빚어내는 창의적 실험, 혁신적인 디지털 아트 플랫폼
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center gap-4 pt-4"
          >
            <Link href="/projects">
              <Button
                size="lg"
                className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              >
                프로젝트 보기
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
