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
            <h2 className="mb-3 text-2xl font-semibold">미션 Mission</h2>
            <p className="text-gray-600">
              아티스트와 팬을 연결하고 지속가능한 창작 생태계를 만듭니다.
            </p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold">
              주요 활동 Impact Area
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Digital Art Platform</h3>
                <ul className="text-sm text-gray-600 *:py-1">
                  <li>디지털 아티스트들의 창작 활동을 위한 통합 플랫폼</li>
                  <li>✔ NFT 아트 갤러리와 작품 거래 시스템</li>
                  <li>✔ 크리에이터 펀딩과 후원 프로그램</li>
                  <li>✔ 아티스트-팬 커뮤니티 빌딩</li>
                  <li>✔ 디지털 아트 교육과 워크숍</li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Art Festival</h3>
                <ul className="text-sm text-gray-600 *:py-1">
                  <li>온·오프라인을 넘나드는 혁신적인 예술 축제</li>
                  <li>✔ 실감형 디지털 아트 전시</li>
                  <li>✔ 인터랙티브 퍼포먼스와 라이브 쇼</li>
                  <li>✔ 글로벌 아티스트 레지던시 프로그램</li>
                  <li>
                    ✔ 테크놀로지와 예술의 경계를 탐험하는 실험적 프로젝트
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">
              함께 만들어요 Create with Us
            </h2>
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
