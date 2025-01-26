import ProjectFilterWrapper from '@/components/project/project-filter-wrapper';
import ProjectGridSkeleton from '@/components/project/project-grid-skeleton';
import { Suspense } from 'react';

const Loading = () => {
  const categories = [
    { value: 'exhibition', label: '전시' },
    { value: 'performance', label: '공연' },
    { value: 'festival', label: '페스티벌' },
    { value: 'workshop', label: '워크숍' },
  ];

  const years = Array.from(
    { length: new Date().getFullYear() - 2017 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">프로젝트</h1>
        <p className="max-w-2xl text-gray-600">
          2018년부터 이어온 PRECTXE의 예술적 여정을 살펴보세요. 전시, 공연,
          워크숍 등 다양한 프로젝트들을 만나볼 수 있습니다.
        </p>
      </div>

      <Suspense fallback={<div>loading...</div>}>
        <div className="mb-8">
          <ProjectFilterWrapper years={years} categories={categories} />
        </div>
      </Suspense>

      <ProjectGridSkeleton />
    </div>
  );
};

export default Loading;
