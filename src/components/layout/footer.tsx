import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
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
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
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

        {/* 사업자 정보 */}
        <div className="mt-8 border-t border-neutral-200 pt-8 text-xs leading-relaxed text-neutral-500">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="text-neutral-400">상호</span>{' '}
              {BUSINESS_INFO.companyName}
            </span>
            <span>
              <span className="text-neutral-400">대표</span>{' '}
              {BUSINESS_INFO.representative}
            </span>
            <span>
              <span className="text-neutral-400">사업자등록번호</span>{' '}
              {BUSINESS_INFO.businessNumber}
            </span>
            <span>
              <span className="text-neutral-400">통신판매업 신고번호</span>{' '}
              {BUSINESS_INFO.mailOrderNumber ?? '신고 예정'}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="text-neutral-400">주소</span>{' '}
              {BUSINESS_INFO.address}
            </span>
            <span>
              <span className="text-neutral-400">문의</span>{' '}
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                className="underline-offset-2 hover:underline"
              >
                {BUSINESS_INFO.email}
              </a>
              {BUSINESS_INFO.phone && (
                <span className="ml-2">
                  <span className="text-neutral-400">전화</span>{' '}
                  {BUSINESS_INFO.phone}
                </span>
              )}
            </span>
          </div>

          {/* 법적 링크 + 카피라이트 */}
          <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 md:flex-row md:items-center md:justify-between">
            <nav>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-500">
                <li>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-neutral-900"
                  >
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="font-medium text-neutral-700 transition-colors hover:text-neutral-900"
                  >
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund-policy"
                    className="transition-colors hover:text-neutral-900"
                  >
                    환불 · 취소 정책
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="text-neutral-400">
              © {new Date().getFullYear()} {BUSINESS_INFO.companyName}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
