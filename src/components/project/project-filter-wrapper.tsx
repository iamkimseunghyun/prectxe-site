'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import ProjectFilter from '@/components/project/project-filter';
import { Suspense, useTransition } from 'react';
import ProjectGridSkeleton from '@/components/project/project-grid-skeleton';
import Loading from '@/app/projects/loading';

interface ProjectFilterWrapperProps {
  years: number[];
  categories: { value: string; label: string }[];
}

const ProjectFilterWrapper = ({
  years,
  categories,
}: ProjectFilterWrapperProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateSearchParams = (key: string, value: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/projects?${params.toString()}`);
    });
  };

  const onYearChange = (year: string) => {
    updateSearchParams('year', year === 'all-year' ? null : year);
  };

  const onCategoryChange = (category: string) => {
    updateSearchParams(
      'category',
      category === 'all-category' ? null : category
    );
  };

  const onSortChange = (sort: string) => {
    updateSearchParams('sort', sort);
  };

  return (
    <>
      <Suspense fallback={<Loading />}>
        <ProjectFilter
          years={years}
          categories={categories}
          selectedYear={searchParams.get('year') ?? 'all-year'}
          selectedCategory={searchParams.get('category') ?? 'all-category'}
          selectedSort={searchParams.get('sort') ?? 'latest'}
          onYearChange={onYearChange}
          onCategoryChange={onCategoryChange}
          onSortChange={onSortChange}
        />
        {isPending && (
          <div className="mt-8">
            <ProjectGridSkeleton />
          </div>
        )}
      </Suspense>
    </>
  );
};

export default ProjectFilterWrapper;
