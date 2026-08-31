import { Skeleton } from '@/components/ui/skeleton';
import { PAGINATION } from '@/lib/constants/constants';

/**
 * ArtistCard와 동일한 그리드/비율을 쓰는 스켈레톤.
 * 공용 GridSkeleton은 카드 수(5)와 컬럼 브레이크포인트(md)가 실제 아티스트
 * 그리드(6 / sm)와 달라 스트리밍 전환 시 레이아웃이 튀었다.
 */
const ArtistGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
    {Array.from({ length: PAGINATION.ARTISTS_PAGE_SIZE }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
      <div key={i}>
        <Skeleton className="aspect-4/5 w-full rounded-xl" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export default ArtistGridSkeleton;
