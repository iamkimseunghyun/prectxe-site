import { ProjectGrid } from '@/components/page/project/project-grid';
import ProjectFilterWrapper from '@/components/page/project/project-filter-wrapper';
import { Suspense } from 'react';
import { getAllProjects } from '@/app/projects/actions';

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    category?: string;
    sort?: string;
    search?: string;
  }>;
}) => {
  // searchParams의 각 값을 const로 추출
  const params = await searchParams;
  const year = params?.year ?? 'all-year';
  const category = params?.category ?? 'all-category';
  const sort = params?.sort ?? 'latest';
  const search = params?.search ?? '';

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

  const projects = await getAllProjects(year, category, sort, search);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">프로젝트</h1>
        <p className="max-w-2xl text-gray-600">
          2018년부터 이어온 PRECTXE의 예술적 여정을 살펴보세요. 전시, 공연,
          워크숍 등 다양한 프로젝트들을 만나볼 수 있습니다.
        </p>
      </div>

      <Suspense>
        <div className="mb-8">
          <ProjectFilterWrapper years={years} categories={categories} />
        </div>
      </Suspense>

      <ProjectGrid projects={projects} />
    </div>
  );
};

export default Page;
