import {
  ArrowRight,
  Headphones,
  Lightbulb,
  MonitorPlay,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import InstagramIcon from '@/components/icons/instagram';
import YoutubeIcon from '@/components/icons/youtube';

export const metadata: Metadata = {
  title: 'Partnership | PRECTXE',
  description:
    'PRECTXE와 함께 브랜드의 철학을 가장 진보적인 감각으로 재설계하세요. 스폰서십, 브랜드 이벤트, 콘텐츠 협업.',
  openGraph: {
    title: 'Partnership | PRECTXE',
    description:
      'Experience Architecture: Where Technology Meets Art. 스폰서십, 브랜드 이벤트, 콘텐츠 협업.',
    type: 'website',
  },
};

const stats = [
  { value: '1,600+', label: 'Total Audience', sub: '누적 관객 수' },
  { value: '1,000+', label: 'Paid Tickets', sub: '유료 결제 관객' },
  {
    value: '72%',
    label: '25-39 Trendsetters',
    sub: '핵심 타겟 비율',
  },
  {
    value: '98%',
    label: 'Satisfaction',
    sub: '경험 만족도',
  },
];

const services = [
  {
    icon: Headphones,
    title: 'Series Sponsorship',
    description:
      'PRECTXE의 정기 공연 시리즈의 공식 파트너로서 브랜드 노출 및 타겟 오디언스 마케팅.',
  },
  {
    icon: Sparkles,
    title: 'Custom Brand Activation',
    description:
      '브랜드 런칭, 팝업스토어, 신제품 발표회 등을 위한 맞춤형 AV 퍼포먼스 및 공간 연출 솔루션.',
  },
  {
    icon: MonitorPlay,
    title: 'IP & Content Collaboration',
    description:
      'PRECTXE의 독창적인 영상/사운드 IP를 활용한 디지털 콘텐츠 제작 및 라이선싱.',
  },
];

const strengths = [
  {
    icon: Users,
    title: 'Curated Community',
    description:
      '대한민국에서 가장 감각적인 2030 트렌드세터, 미디어 아티스트, IT 전문가들이 모이는 유일한 플랫폼.',
  },
  {
    icon: Zap,
    title: 'Tech-Integration',
    description:
      'Max MSP, TouchDesigner 등 최첨단 기술을 활용한 압도적인 오디오비주얼 퍼포먼스 기획력.',
  },
  {
    icon: Lightbulb,
    title: 'Unique Venue',
    description:
      '부천 B39, 블루스퀘어 등 공간의 미학을 극대화하는 독보적인 장소 큐레이션.',
  },
];

export default function PartnershipPage() {
  return (
    <div className="bg-neutral-950 text-white">
      {/* Section 1: Hero */}
      <section className="relative flex min-h-[85vh] flex-col justify-center px-6 md:px-12 lg:px-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          PRECTXE for Business
        </p>
        <h1 className="max-w-4xl text-3xl font-light leading-snug tracking-tight md:text-5xl md:leading-snug lg:text-6xl lg:leading-snug">
          Experience Architecture:
          <br />
          <span className="text-neutral-400">Where Technology Meets Art.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-neutral-400 md:text-lg">
          PRECTXE는 단순한 공연을 넘어, 브랜드의 철학을 가장 진보적인 감각으로
          재설계합니다. 우리는 소리와 빛으로 경험의 새로운 표준을 만듭니다.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#inquiry"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            프로젝트 문의
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Section 2: Why PRECTXE */}
      <section className="border-t border-neutral-800 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          The Power of High-Density Audience
        </p>
        <div className="grid gap-12 md:grid-cols-3">
          {strengths.map((item) => (
            <div key={item.title}>
              <item.icon className="mb-4 h-6 w-6 text-neutral-400" />
              <h3 className="text-lg font-medium">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Performance Data */}
      <section className="border-t border-neutral-800 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Validated Impact
        </p>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-light tracking-tight md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-neutral-300">
                {stat.label}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{stat.sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 max-w-2xl text-sm leading-relaxed text-neutral-500">
          우리는 단순한 숫자가 아니라, 브랜드에 열광할 준비가 된 &lsquo;진성
          팬덤&rsquo;을 보유하고 있습니다.
        </p>
      </section>

      {/* Section 4: Services */}
      <section className="border-t border-neutral-800 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Collaborative Solutions
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 transition-colors hover:border-neutral-700"
            >
              <service.icon className="mb-4 h-6 w-6 text-neutral-400" />
              <h3 className="text-lg font-medium">{service.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Global Network */}
      <section className="border-t border-neutral-800 px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Global Network
        </p>
        <div className="flex flex-wrap gap-x-12 gap-y-6 text-lg font-light text-neutral-500 md:text-xl">
          {[
            'Max Cooper',
            'A.G. Cook',
            'Oklou',
            'B39 Bucheon',
            'Blue Square',
          ].map((name) => (
            <span key={name} className="transition-colors hover:text-white">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Section 6: Inquiry CTA */}
      <section
        id="inquiry"
        className="border-t border-neutral-800 px-6 py-24 md:px-12 md:py-32 lg:px-24"
      >
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Let&apos;s Innovate Together
        </p>
        <div className="max-w-xl space-y-6">
          <p className="text-sm leading-relaxed text-neutral-400">
            스폰서십, 브랜드 이벤트, 콘텐츠 협업 등 어떤 형태의 파트너십이든
            환영합니다. 아래 메일로 문의해 주세요.
          </p>
          <a
            href="mailto:info@laaf.kr?subject=PRECTXE%20Partnership%20Inquiry"
            className="inline-block text-lg font-medium text-white underline underline-offset-4 transition-colors hover:text-neutral-400"
          >
            info@laaf.kr
          </a>
          <div className="flex items-center gap-4 pt-2">
            <Link
              href="https://www.instagram.com/prectxe/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-white"
            >
              <InstagramIcon className="size-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link
              href="https://www.youtube.com/@prectxe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-white"
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
