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

export default function Page() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col justify-center px-6 md:px-12 lg:px-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Seoul-based Tech-Art Platform
        </p>
        <h1 className="max-w-3xl text-3xl font-light leading-snug tracking-tight md:text-5xl md:leading-snug">
          사운드와 비주얼이 만나는
          <br />
          전시, 라이브, 파티를 만들고
          <br />그 경험을 기록합니다.
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          PRECTXE는 서울을 기반으로 활동하는 테크-아트 플랫폼입니다. 미디어
          아트, 오디오비주얼 퍼포먼스, 사운드 중심의 프로그램을 기획하고, 그
          과정을 디지털 아카이브로 남깁니다.
        </p>
      </section>

      {/* What we do */}
      <section className="border-t px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          What we do
        </h2>
        <div className="grid gap-16 md:grid-cols-3 md:gap-12">
          <div>
            <h3 className="text-lg font-medium">큐레이션 & 크리에이션</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              독자적인 AV/테크 세계관 안에서 오직 PRECTXE만의 경험을 설계합니다.
              전시, 라이브 퍼포먼스, 파티, 워크숍, 토크를 기획하고 조명과
              미디어아트의 협업을 통해 감각의 경계를 확장합니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">디지털 아카이브</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              공연의 전 과정을 기술적으로 기록하고, 아티스트의 테크-노트를
              매체화합니다. 일회성으로 휘발되는 현장 경험을 지속적인 가치로
              전환하고, 로컬 테크-아티스트를 인큐베이팅합니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">씬 & 커뮤니티</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              비주얼 아티스트, 뮤지션, 기획자가 만나는 접점을 만듭니다. 독점
              미디어를 발행하고 커뮤니티를 구축하여, 창작자들이 자립할 수 있는
              생태계를 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <h2 className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Contact
        </h2>
        <div className="max-w-xl space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            협업, 출연, 전시 제안, 공간 대관 문의는 아래 메일로 보내주세요.
            <br />
            SNS를 통해서도 소식을 확인하실 수 있습니다.
          </p>
          <a
            href="mailto:info@laaf.kr"
            className="inline-block text-lg font-medium underline underline-offset-4 transition-colors hover:text-muted-foreground"
          >
            info@laaf.kr
          </a>
          <div className="flex items-center gap-4 pt-2">
            <Link
              href="https://www.instagram.com/prectxe/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <InstagramIcon className="size-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link
              href="https://www.youtube.com/@prectxe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <YoutubeIcon className="size-5" />
              <span className="sr-only">YouTube</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
