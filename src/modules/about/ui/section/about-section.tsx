import Link from 'next/link';
import { Button } from '@/components/ui/button';

const AboutSection = () => {
  return (
    <section className="mb-12 py-12">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold">About PRECTXE</h2>
          <p className="line-clamp-2 text-gray-600">
            2018년 시작된 PRECTXE는 디지털 아티스트의 실험을 지원하고,
            전시·공연·워크숍을 통해 기술과 예술이 만나는 새로운 경험을 만듭니다.
          </p>
          <div>
            <Link href="/about">
              <Button variant="outline">더 보기</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
