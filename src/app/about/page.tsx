import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

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
            <h2 className="mb-3 text-2xl font-semibold">Our Vision</h2>
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
                <p className="text-sm text-gray-600">
                  아티스트들의 작품을 전시하고 판매하는 온라인 갤러리 플랫폼
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Art Festival</h3>
                <p className="text-sm text-gray-600">
                  디지털 아트와 퍼포먼스가 결합된 현장 축제 개최
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">Join Us</h2>
            <p className="mb-4 text-gray-600">
              새로운 디지털 아트의 세계를 함께 만들어갈 아티스트와 관람객을
              기다립니다.
            </p>
            <Link
              href="/artists/new"
              className="inline-block rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              아티스트 등록하기
            </Link>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
