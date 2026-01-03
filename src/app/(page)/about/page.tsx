import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Metadata } from 'next';
import { Globe, Music2, Palette, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About PRECTXE | 디지털 아트 플랫폼',
  description:
    'PRECTXE는 디지털 아트와 현실을 잇는 플랫폼입니다. 온/오프라인을 넘나드는 새로운 예술 경험을 제공합니다.',
  openGraph: {
    title: 'About PRECTXE | 디지털 아트 플랫폼',
    description: '디지털 아트와 현실을 잇는 혁신적인 예술 플랫폼',
    type: 'website',
    url: 'https://prectxe-demo-site.vercel.app/about',
  },
  keywords: [
    'PRECTXE',
    '디지털 아트',
    '예술 플랫폼',
    '아트 페스티벌',
    '온라인 갤러리',
  ],
  alternates: {
    canonical: 'https://prectxe-demo-site.vercel.app/about',
  },
};

const Page = () => {
  return (
    <div className="relative isolate">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.15),transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.25),transparent)]" />

      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4" variant="secondary">
            About PRECTXE
          </Badge>
          <h1 className="bg-gradient-to-b from-black to-zinc-600 bg-clip-text text-4xl font-bold text-transparent dark:from-white dark:to-zinc-400 sm:text-5xl md:text-6xl">
            디지털 아트와 현실을 잇다
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-300 sm:text-lg">
            PRECTXE는 온라인과 오프라인의 경계를 넘어 새로운 예술 경험을
            창조하는 디지털 아트 플랫폼이자 페스티벌입니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="#join">아티스트 등록하기</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/programs">프로그램 보기</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: '참여 아티스트', value: '120+' },
            { label: '커뮤니티 회원', value: '10K+' },
            { label: '연간 프로그램', value: '30+' },
          ].map((s) => (
            <Card
              key={s.label}
              className="border-zinc-200/60 dark:border-zinc-800/80"
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-zinc-500 sm:text-sm">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="container mx-auto px-4 pb-12 md:pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Card className="border-zinc-200/60 dark:border-zinc-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="size-5 text-blue-600" /> 비전 Vision
              </CardTitle>
              <CardDescription>
                PRECTXE는 디지털 아트와 현실 세계를 연결하는 플랫폼입니다.
                온라인과 오프라인의 경계를 넘어 새로운 예술 경험을 창조합니다.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/60 dark:border-zinc-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Globe className="size-5 text-blue-600" /> 미션 Mission
              </CardTitle>
              <CardDescription>
                아티스트와 팬을 연결하고, 지속가능한 창작 생태계를 구축합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Impact Areas */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-center text-2xl font-semibold md:text-3xl">
            주요 활동 Impact Area
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-zinc-200/60 dark:border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Palette className="size-5 text-blue-600" /> Digital Art
                  Platform
                </CardTitle>
                <CardDescription>
                  디지털 아티스트들의 창작과 수익 활동을 위한 통합 플랫폼
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
                  <li>아티스트 갤러리와 작품 거래 시스템</li>
                  <li>창작자·기획자 프로젝트 펀딩/후원 프로그램</li>
                  <li>아티스트-팬-기획자 커뮤니티 빌딩</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-zinc-200/60 dark:border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Music2 className="size-5 text-blue-600" /> Art Festival
                </CardTitle>
                <CardDescription>
                  온·오프라인을 넘나드는 예술 축제와 전시/공연 프로그램
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
                  <li>디지털 아트 전시</li>
                  <li>전자음악·인터랙티브 라이브 공연</li>
                  <li>테크놀로지×예술 실험적 프로젝트</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join" className="container mx-auto px-4 pb-24">
        <Card className="mx-auto max-w-5xl overflow-hidden border-zinc-200/60 bg-gradient-to-br from-white to-zinc-50 shadow-sm dark:border-zinc-800/80 dark:from-neutral-900 dark:to-neutral-950">
          <CardContent className="relative p-8 md:p-10">
            <div className="absolute right-0 top-0 -z-10 size-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-2xl font-semibold md:text-3xl">
                함께 만들어요 Create with Us
              </h3>
              <p className="mt-3 text-zinc-600 dark:text-zinc-300">
                새로운 디지털 아트의 세계를 함께 만들어갈 아티스트와 관람객을
                기다립니다.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg">아티스트 등록하기</Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/programs">더 알아보기</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Page;
