import PageHeader from '@/components/layout/page-header';
import { ArtistSearch } from '@/components/artist/artist-search';
import { ArtistFilter } from '@/components/artist/artist-filter';
import { ArtistGrid } from '@/components/artist/artist-grid';
import { Suspense } from 'react';

export default function ArtistsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="아티스트"
        description="PRECTXE의 모든 아티스트들을 만나보세요"
      />

      <Suspense fallback={<div>loading...</div>}>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ArtistSearch />
          <ArtistFilter />
        </div>
      </Suspense>

      <ArtistGrid />
    </div>
  );
}
