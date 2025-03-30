import { Metadata } from 'next';
import { globalSearch } from '@/app/actions';
import { Suspense } from 'react';

import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';
import { SearchBar } from '@/components/search/search-bar';
import SearchResults from '@/components/search/search-results';

export const dynamic = 'force-dynamic';

export function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Metadata {
  const query = searchParams.q || '';
  return {
    title: query ? `"${query}" 검색 결과` : '검색',
    description: '프렉티스 아티스트, 작품, 이벤트, 프로젝트에 대한 검색 결과',
  };
}

const SearchPage = async ({
  searchParams,
}: {
  searchParams: { q?: string };
}) => {
  const query = searchParams.q || '';
  const results = query ? await globalSearch(query) : [];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold">검색</h1>
        <div className="mb-6">
          <Suspense>
            <SearchBar defaultValue={query} />
          </Suspense>
        </div>

        {query && (
          <p className="text-muted-foreground">
            "{query}"에 대한 검색 결과 {results.length}개
          </p>
        )}
      </div>

      <Suspense fallback={<GridSkeleton />}>
        {query ? (
          <SearchResults results={results} query={query} />
        ) : (
          <div className="flex h-40 items-center justify-center text-center text-muted-foreground">
            <p>
              검색어를 입력하여 아티스트, 작품, 이벤트, 프로젝트를 찾아보세요.
            </p>
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default SearchPage;
