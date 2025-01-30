'use client';
import Link from 'next/link';
import { InstagramIcon, TwitterIcon, Youtube } from 'lucide-react';

export function Footer() {
  const socials = [
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/prectxe/',
      icon: InstagramIcon,
    },
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/@prectxe',
      icon: Youtube,
    },
    { name: 'Twitter', href: '#', icon: TwitterIcon },
  ];

  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* 좌측: 로고 및 설명 */}
          <div>
            <h2 className="mb-4 text-xl font-bold">PRECTXE</h2>
            <p className="max-w-md text-gray-600">
              {/* Digital art festival showcasing innovative works at the
              intersection of technology and creativity.*/}
              기술과 창의성이 만나는 곳에서 펼쳐지는 혁신적인 디지털 아트 플랫폼
            </p>
          </div>

          {/* 우측: 링크 및 소셜 */}
          <div className="space-y-6">
            {/* 소셜 링크 */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Follow Us</h3>
              <ul className="flex gap-4">
                {socials.map((social) => (
                  <li key={social.name}>
                    <Link
                      href={social.href}
                      className="text-gray-600 transition-colors hover:text-black"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <social.icon className="size-5" />
                      <span className="sr-only"> {social.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 연락처 */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Contact</h3>
              <p className="text-gray-600">info@laaf.io</p>
            </div>
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
