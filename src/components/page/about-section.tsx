import Link from 'next/link';
import { Button } from '@/components/ui/button';

const AboutSection = () => {
  return (
    <section className="mb-12 bg-gray-50 py-20">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-3xl font-bold">About PRECTXE</h2>
          <p className="text-gray-600">
            2018년, PRECTXE는 디지털 아티스트들의 창의적인 실험을 위한
            플랫폼으로 시작되었습니다. 전시, 공연, 워크숍을 통해 기술과 예술이
            만나는 새로운 경험을 제시합니다.
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
