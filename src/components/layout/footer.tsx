import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { NewsletterForm } from './newsletter-form';

const EXPLORE_LINKS = [
  { href: '/drops', label: 'Drops' },
  { href: '/programs', label: 'Programs' },
  { href: '/journal', label: 'Journal' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/artists', label: 'Artists' },
  { href: '/venues', label: 'Venues' },
  { href: '/partnership', label: 'Partnership' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/refund-policy', label: '환불 · 취소 정책' },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-screen-2xl px-6 pb-10 pt-20 md:px-12 md:pb-14 md:pt-28 lg:px-24">
        {/* Main grid */}
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-6 lg:col-span-5">
            <Link href="/" className="block" aria-label="PRECTXE 홈으로">
              <p className="text-5xl font-light leading-none tracking-tight text-neutral-900 md:text-6xl lg:text-7xl">
                PRECTXE
              </p>
            </Link>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-neutral-500">
              전자음악 씬 큐레이션 · 이벤트 프로모션 · 문화 플랫폼
            </p>
          </div>

          {/* Explore */}
          <div className="md:col-span-3 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Explore
            </p>
            <ul className="mt-5 space-y-3">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-neutral-700 transition-colors hover:text-neutral-950"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-3 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Company
            </p>
            <ul className="mt-5 space-y-3">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-neutral-700 transition-colors hover:text-neutral-950"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-12 lg:col-span-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Newsletter
            </p>
            <p className="mt-5 text-sm leading-relaxed text-neutral-500">
              다음 Drop과 Journal을 가장 먼저 받아보세요.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-16 border-t border-neutral-200 pt-8 md:mt-20">
          <div className="flex flex-col gap-6 text-[11px] leading-relaxed text-neutral-400 md:flex-row md:items-start md:justify-between">
            {/* 사업자 정보 (전자상거래법상 공시 의무) */}
            <div className="max-w-3xl space-y-1">
              <p>
                <span className="text-neutral-600">
                  {BUSINESS_INFO.companyName}
                </span>
                <span className="mx-2 text-neutral-300">·</span>
                대표 {BUSINESS_INFO.representative}
                <span className="mx-2 text-neutral-300">·</span>
                사업자등록번호 {BUSINESS_INFO.businessNumber}
                <span className="mx-2 text-neutral-300">·</span>
                통신판매업 신고번호{' '}
                {BUSINESS_INFO.mailOrderNumber ?? '신고 예정'}
              </p>
              <p>
                {BUSINESS_INFO.address}
                <span className="mx-2 text-neutral-300">·</span>
                <a
                  href={`mailto:${BUSINESS_INFO.email}`}
                  className="underline-offset-2 transition-colors hover:text-neutral-700 hover:underline"
                >
                  {BUSINESS_INFO.email}
                </a>
                {BUSINESS_INFO.phone && (
                  <>
                    <span className="mx-2 text-neutral-300">·</span>
                    {BUSINESS_INFO.phone}
                  </>
                )}
              </p>
            </div>

            {/* 법적 링크 + 카피라이트 */}
            <div className="flex flex-col items-start gap-3 md:items-end">
              <nav>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {LEGAL_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="transition-colors hover:text-neutral-700"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <p>
                © {new Date().getFullYear()} {BUSINESS_INFO.companyName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
