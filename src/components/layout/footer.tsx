'use client';
import Link from 'next/link';
import { socialIcons } from '@/lib/constants/constants';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* 로고 */}
          <div>
            <Link href="/" className="text-sm font-medium text-neutral-900">
              PRECTXE
            </Link>
          </div>

          {/* 링크 */}
          <nav className="text-sm text-neutral-500">
            <ul className="flex gap-6">
              <li>
                <Link
                  href="/programs"
                  className="transition-colors hover:text-neutral-900"
                >
                  Archive
                </Link>
              </li>
              <li>
                <Link
                  href="/journal"
                  className="transition-colors hover:text-neutral-900"
                >
                  Journal
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-neutral-900"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>

          {/* 소셜 */}
          <div className="flex gap-4">
            {socialIcons.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                className="text-neutral-400 transition-colors hover:text-neutral-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                <social.icon className="size-5" />
                <span className="sr-only">{social.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 카피라이트 */}
        <div className="mt-8 border-t border-neutral-200 pt-8 text-xs text-neutral-400">
          © {new Date().getFullYear()} PRECTXE
        </div>
      </div>
    </footer>
  );
}
