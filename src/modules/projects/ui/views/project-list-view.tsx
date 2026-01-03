import { Suspense } from 'react';
import CardSkeleton from '@/components/layout/skeleton/card-skeleton';
import { getAllProjects } from '@/modules/projects/server/actions';
import SelectFilter from '@/modules/projects/ui/components/select-filter';
import { ProjectCard } from '@/modules/projects/ui/section/project-card';

// Define the Skeleton component for loading state
const ProjectListSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

interface ProjectsViewProps {
  params: {
    year?: string;
    category?: string;
    sort?: string;
    search?: string;
  };
}

// Rename the async data fetching part for clarity and Suspense usage
async function FilteredProjectList({ params }: ProjectsViewProps) {
  const year = params?.year ?? 'all-year';
  const category = params?.category ?? 'all-category';
  const sort = params?.sort ?? 'latest';
  const search = params?.search ?? '';

  const projects = await getAllProjects(year, category, sort, search);

  if (projects.data?.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        <p>프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.data?.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

export const ProjectListView = async ({ params }: ProjectsViewProps) => {
  const categories = [
    { value: 'exhibition', label: '전시' },
    { value: 'performance', label: '공연' },
    { value: 'festival', label: '페스티벌' },
    { value: 'workshop', label: '워크숍' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2017 }, // length 계산 확인
    (_, i) => currentYear - i
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">프로젝트</h1>
        <p className="max-w-2xl text-muted-foreground">
          2018년부터 이어온 PRECTXE의 예술적 여정을 살펴보세요. 전시, 공연,
          워크숍 등 다양한 프로젝트들을 만나볼 수 있습니다.
        </p>
      </div>

      <div className="mb-8">
        <SelectFilter
          years={years}
          categories={categories}
          pathname="projects"
        />
      </div>

      {/* Project List Section with Suspense for loading */}
      <Suspense fallback={<ProjectListSkeleton />}>
        <FilteredProjectList params={params} />
      </Suspense>
    </div>
  );
};
