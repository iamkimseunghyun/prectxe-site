import { Suspense } from 'react';
import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';
import { PAGINATION } from '@/lib/constants/constants';
import { getArtworksPage } from '@/modules/artworks/server/actions';
import ArtworkGridSection from '@/modules/artworks/ui/section/artwork-grid-section';

export const ArtworkListView = async () => {
  const initialArtworks = await getArtworksPage(
    0,
    PAGINATION.ARTWORKS_PAGE_SIZE
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">작품 소개</h1>
        <p className="max-w-2xl text-muted-foreground">
          지금까지 PRECTXE에서 소개된 훌륭한 작품들에 많은 관심을 가져주세요.
        </p>
      </div>

      {/* 아트워크 목록에 대한 Suspense 경계 설정 */}
      <Suspense fallback={<GridSkeleton />}>
        <ArtworkGridSection initialArtworks={initialArtworks} />
      </Suspense>
    </div>
  );
};
