import type { Metadata } from 'next';
import Link from 'next/link';
import InstagramIcon from '@/components/icons/instagram';
import YoutubeIcon from '@/components/icons/youtube';

export const metadata: Metadata = {
  title: 'About | PRECTXE',
  description:
    '사운드와 비주얼이 만나는 전시, 라이브, 파티를 만들고 그 경험을 기록하는 서울 기반 테크-아트 플랫폼.',
  openGraph: {
    title: 'About | PRECTXE',
    description:
      '사운드와 비주얼이 만나는 전시, 라이브, 파티를 만들고 그 경험을 기록하는 서울 기반 테크-아트 플랫폼',
    type: 'website',
  },
  keywords: [
    'PRECTXE',
    '테크-아트',
    '디지털 아트',
    '전시',
    '라이브',
    '아카이브',
  ],
};

const Page = () => {
  return (
    <div className="relative min-h-screen bg-white text-neutral-900">
      {/* Hero — full-viewport manifesto */}
      <section className="flex min-h-screen flex-col justify-center px-6 md:px-12 lg:px-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Seoul-based Tech-Art Platform
        </p>
        <h1 className="max-w-3xl text-3xl font-light leading-snug tracking-tight md:text-5xl md:leading-snug">
          사운드와 비주얼이 만나는
          <br />
          전시, 라이브, 파티를 만들고
          <br />
          그 경험을 기록합니다.
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-500 md:text-lg">
          PRECTXE는 서울을 기반으로 활동하는 테크-아트 플랫폼입니다. 미디어
          아트, 오디오비주얼 퍼포먼스, 사운드 중심의 프로그램을 기획하고, 그
          과정을 디지털 아카이브로 남깁니다.
        </p>

        {/* scroll hint */}
        <div className="mt-16 text-xs tracking-widest text-neutral-300 md:mt-24">
          Scroll&ensp;↓
        </div>
      </section>

      {/* What we do — 3-column grid */}
      <section className="border-t border-neutral-200 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          What we do
        </h2>
        <div className="grid gap-16 md:grid-cols-3 md:gap-12">
          <div>
            <h3 className="text-lg font-medium text-neutral-900">
              큐레이션 & 크리에이션
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              독자적인 AV/테크 세계관 안에서 오직 PRECTXE만의 경험을
              설계합니다. 전시, 라이브 퍼포먼스, 파티, 워크숍, 토크를 기획하고
              조명과 미디어아트의 협업을 통해 감각의 경계를 확장합니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-neutral-900">
              디지털 아카이브
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              공연의 전 과정을 기술적으로 기록하고, 아티스트의 테크-노트를
              매체화합니다. 일회성으로 휘발되는 현장 경험을 지속적인 가치로
              전환하고, 로컬 테크-아티스트를 인큐베이팅합니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-neutral-900">
              씬 & 커뮤니티
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              비주얼 아티스트, 뮤지션, 기획자가 만나는 접점을 만듭니다. 독점
              미디어를 발행하고 커뮤니티를 구축하여, 창작자들이 자립할 수 있는
              생태계를 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Differentiation — old vs new */}
      <section className="border-t border-neutral-200 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Our approach
        </h2>
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-300">
              기존 모델
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-neutral-400">
              <li>아티스트 섭외, 무대 대여, 티켓 판매 중심의 단순 중개</li>
              <li>내한 공연 위주의 일회성 이벤트, 휘발되는 현장 경험</li>
              <li>티켓 판매 수익에만 의존하는 단순한 비즈니스 모델</li>
            </ul>
          </div>
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-900">
              PRECTXE 모델
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-neutral-600">
              <li>
                <span className="font-medium text-neutral-900">
                  Curator & Creator
                </span>
                &ensp;—&ensp;독자적 AV/테크 세계관 내에서 오직 PRECTXE만의
                경험을 설계
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Scene & Community
                </span>
                &ensp;—&ensp;디지털 아카이빙으로 지속적 가치 창출, 로컬
                테크-아티스트 인큐베이팅
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  IP & Business
                </span>
                &ensp;—&ensp;연출 포맷 및 디자인 IP 라이선싱, 브랜드 공간 B2B
                크리에이티브
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Values — 4 pillars */}
      <section className="border-t border-neutral-200 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Values
        </h2>
        <div className="grid grid-cols-2 gap-x-12 gap-y-16 md:grid-cols-4">
          {[
            {
              label: '신뢰',
              en: 'Trust',
              desc: '디지털 아카이브를 통한 권위 형성',
            },
            {
              label: '연결',
              en: 'Connect',
              desc: '커머스를 통한 팬덤의 결속',
            },
            {
              label: '자립',
              en: 'Independence',
              desc: '플랫폼을 통한 창작자 생태계 지원',
            },
            {
              label: '통합',
              en: 'Integration',
              desc: '온·오프라인 페스티벌로의 확장',
            },
          ].map((v) => (
            <div key={v.en}>
              <p className="text-2xl font-light text-neutral-900">{v.label}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-neutral-400">
                {v.en}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap — 4 steps */}
      <section className="border-t border-neutral-200 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Roadmap
        </h2>
        <ol className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Digital Archiving',
              sub: '권위의 형성',
              desc: '공연 전 과정 기술적 기록, 아티스트 테크-노트 매체화. AV/테크-아트 글로벌 지식 저장소로 포지셔닝.',
            },
            {
              step: '02',
              title: 'Commerce',
              sub: '팬덤의 소유와 결속',
              desc: '자체 D2C 티켓 판매, 한정판 디지털 아트/굿즈 드롭. 유료 결제 데이터 확보 및 수익 다각화.',
            },
            {
              step: '03',
              title: 'Platform',
              sub: '생태계 인프라화',
              desc: '티켓/커머스 솔루션 SaaS 제공, 외부 기획자 지원. 니치 문화 결제 데이터 독점.',
            },
            {
              step: '04',
              title: 'Integrated Festival',
              sub: '최종 종착지',
              desc: '오프라인 감각 × 온라인 소통 실시간 연동 대규모 페스티벌. 생태계 전체가 모이는 그랜드 쇼케이스.',
            },
          ].map((s) => (
            <li key={s.step} className="relative">
              <span className="text-xs font-medium text-neutral-300">
                Step {s.step}
              </span>
              <h3 className="mt-2 text-lg font-medium text-neutral-900">
                {s.title}
              </h3>
              <p className="mt-1 text-xs text-neutral-400">{s.sub}</p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Contact */}
      <section className="border-t border-neutral-200 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Contact
        </h2>
        <div className="max-w-xl space-y-8">
          <p className="text-sm leading-relaxed text-neutral-500">
            협업, 출연, 전시 제안은 메일로 보내주세요.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:info@laaf.kr"
              className="text-sm text-neutral-900 underline underline-offset-4 transition-colors hover:text-neutral-600"
            >
              info@laaf.kr
            </a>
            <Link
              href="https://www.instagram.com/prectxe/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <InstagramIcon className="size-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link
              href="https://www.youtube.com/@prectxe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <YoutubeIcon className="size-5" />
              <span className="sr-only">YouTube</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer nav */}
      <div className="flex items-center justify-center gap-6 border-t border-neutral-200 py-10 text-xs sm:text-sm">
        <Link
          href="/"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
        >
          Home
        </Link>
        <Link
          href="/programs"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
        >
          Archive
        </Link>
        <Link
          href="/journal"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
        >
          Journal
        </Link>
      </div>
    </div>
  );
};

export default Page;
