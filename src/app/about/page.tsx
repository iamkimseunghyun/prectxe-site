import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Metadata } from 'next';

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
    <div className="container mx-auto py-12">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">PRECTXE</CardTitle>
          <CardDescription>Digital Art Platform & Festival</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="mb-3 text-2xl font-semibold">비전 Vision</h2>
            <p className="text-gray-600">
              PRECTXE는 디지털 아트와 현실 세계를 연결하는 플랫폼입니다.
              온라인과 오프라인의 경계를 넘어 새로운 예술 경험을 창조합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">What We Do</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Digital Art Platform</h3>
                <ul className="text-sm text-gray-600 *:py-1">
                  <li>
                    아티스트들의 작품을 전시하고 판매하는 온라인 갤러리 플랫폼
                  </li>
                  <li>✔ 티켓팅, 작품, 굿즈 판매, 아티스트 후원</li>
                  <li>✔ 아티스트가 직접 작품 판매, 프로젝트 펀딩 개설</li>
                  <li>✔ 아티스트·크리에이터·기획자·팬과 연결</li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Art Festival</h3>
                <ul className="text-sm text-gray-600 *:py-1">
                  <li>디지털 아트와 퍼포먼스가 결합된 현장 축제 개최</li>
                  <li>✔ 전시, 라이브 공연, 인터랙티브 아트</li>
                  <li>✔ 글로벌 아티스트와 협업, 교류하는 예술 콘텐츠</li>
                  <li>✔ 온라인 & 오프라인 예술 생태계 구축</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">Join Us</h2>
            <p className="mb-4 text-gray-600">
              새로운 디지털 아트의 세계를 함께 만들어갈 아티스트와 관람객을
              기다립니다.
            </p>
            <div className="inline-block rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800">
              아티스트 등록하기
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
