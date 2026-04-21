import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { socialIcons } from '@/lib/constants/constants';

const SEP = <span className="mx-2 text-neutral-300">|</span>;

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* 상단: 로고 + Nav + Social */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide text-neutral-900"
          >
            PRECTXE
          </Link>

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

        {/* 구분선 */}
        <div className="my-8 border-t border-neutral-200" />

        {/* 사업자 정보 */}
        <div className="space-y-1.5 text-xs leading-relaxed text-neutral-500">
          <p>
            <span className="text-neutral-400">상호</span>{' '}
            <span className="text-neutral-700">
              {BUSINESS_INFO.companyName}
            </span>
            {SEP}
            <span className="text-neutral-400">대표</span>{' '}
            <span className="text-neutral-700">
              {BUSINESS_INFO.representative}
            </span>
            {SEP}
            <span className="text-neutral-400">사업자등록번호</span>{' '}
            <span className="text-neutral-700">
              {BUSINESS_INFO.businessNumber}
            </span>
            {SEP}
            <span className="text-neutral-400">통신판매업 신고번호</span>{' '}
            <span className="text-neutral-700">
              {BUSINESS_INFO.mailOrderNumber ?? '신고 예정'}
            </span>
          </p>
          <p>
            <span className="text-neutral-400">주소</span>{' '}
            <span className="text-neutral-700">{BUSINESS_INFO.address}</span>
            {SEP}
            <a
              href={`mailto:${BUSINESS_INFO.email}`}
              className="text-neutral-700 underline-offset-2 hover:underline"
            >
              {BUSINESS_INFO.email}
            </a>
            {BUSINESS_INFO.phone && (
              <>
                {SEP}
                <span className="text-neutral-700">{BUSINESS_INFO.phone}</span>
              </>
            )}
          </p>
        </div>

        {/* 법적 링크 + 카피라이트 */}
        <div className="mt-6 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between">
          <nav>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-neutral-500">
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
                  className="transition-colors hover:text-neutral-900"
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
    </footer>
  );
}
