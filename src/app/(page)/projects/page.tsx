import SelectFilter from '@/components/select-filter';
import { Suspense } from 'react';

import { ProjectCard } from '@/components/page/project/project-card';
import { getAllProjects } from '@/app/(page)/projects/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

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
        <p className="max-w-2xl text-muted-foreground">
          2018년부터 이어온 PRECTXE의 예술적 여정을 살펴보세요. 전시, 공연,
          워크숍 등 다양한 프로젝트들을 만나볼 수 있습니다.
        </p>
      </div>

      <Suspense>
        <div className="mb-8">
          <SelectFilter
            years={years}
            categories={categories}
            pathname="projects"
          />
        </div>
      </Suspense>

      <Suspense>
        {projects.data?.length !== 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.data?.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            <p>프로젝트가 없습니다.</p>
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default Page;
