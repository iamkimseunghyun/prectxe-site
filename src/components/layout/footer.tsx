'use client';
import Link from 'next/link';
import { socialIcons } from '@/lib/constants/constants';

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-12">
        {/* 좌측: 로고 및 설명 */}
        <div className="mb-12 flex flex-col items-center justify-center">
          <h2 className="mb-4 text-4xl font-bold">PRECTXE</h2>
          <p className="hidden max-w-xl text-gray-600 sm:block sm:text-xl">
            {/* Digital art festival showcasing innovative works at the
              intersection of technology and creativity.*/}
            기술과 창의성이 만나는 혁신적인 디지털 아트 플랫폼
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* 우측: 링크 및 소셜 */}
          <div className="flex flex-col items-center justify-center">
            {/* 소셜 링크 */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Follow Us</h3>
              <ul className="flex gap-4">
                {socialIcons.map((social) => (
                  <li key={social.name}>
                    <Link
                      href={social.href}
                      className="text-gray-600 transition-colors hover:text-black"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <social.icon className="size-6" />
                      <span className="sr-only"> {social.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* 연락처 */}
          <div className="flex flex-col items-center justify-center">
            <h3 className="mb-3 text-sm font-semibold">Contact</h3>
            <p className="text-gray-600">info@laaf.kr</p>
          </div>
        </div>

        {/* 카피라이트 */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} PRECTXE. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
