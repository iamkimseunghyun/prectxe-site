import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | PRECTXE',
  description:
    'PRECTXE는 디지털 아트 씬을 위한 플랫폼입니다. 전시, 공연, 파티를 기획하고 아카이빙합니다.',
  openGraph: {
    title: 'About | PRECTXE',
    description: '디지털 아트 씬을 위한 플랫폼',
    type: 'website',
  },
  keywords: ['PRECTXE', '디지털 아트', '전시', '공연', '파티'],
};

const Page = () => {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white to-neutral-50" />

      <div className="container mx-auto px-4">
        {/* Hero */}
        <section className="pb-16 pt-24 md:pb-24 md:pt-40">
          <p className="max-w-2xl text-xl leading-relaxed text-neutral-900 md:text-2xl">
            PRECTXE는 2018년부터 디지털 아트 씬을 탐구해온 플랫폼입니다.
            <br className="hidden md:block" />
            전시, 공연, 파티를 기획하고 그 과정을 기록합니다.
          </p>
        </section>

        {/* What we do */}
        <section className="border-t border-neutral-200 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                What we do
              </h2>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">
                  프로그램 기획
                </h3>
                <p className="mt-2 text-neutral-600">
                  디지털 아티스트의 작업을 소개하는 전시, 라이브 공연, 파티를
                  기획합니다. 서울을 중심으로 연간 10회 이상의 프로그램을
                  진행합니다.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">
                  아카이브
                </h3>
                <p className="mt-2 text-neutral-600">
                  지나간 프로그램과 참여 아티스트의 기록을 웹에 남깁니다.
                  일회성으로 끝나지 않도록.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">
                  커뮤니티
                </h3>
                <p className="mt-2 text-neutral-600">
                  비주얼 아티스트, 뮤지션, 기획자가 만나는 접점을 만듭니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-neutral-200 py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                Contact
              </h2>
            </div>
            <div className="space-y-6">
              <p className="text-neutral-600">
                협업, 출연, 전시 제안은 메일로 보내주세요.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <a href="mailto:info@laaf.kr">info@laaf.kr</a>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="https://instagram.com/prectxe" target="_blank">
                    Instagram
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Page;
