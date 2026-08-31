import { Skeleton } from '@/components/ui/skeleton';

/**
 * artists/artworks/venues 공용 카드 그리드 스켈레톤.
 * 세 목록이 동일한 컨테이너(max-w-6xl)·그리드(sm:2 / lg:3)·비율을 쓴다.
 * 공용 GridSkeleton은 카드 수와 컬럼 브레이크포인트가 달라 전환 시 튄다.
 */
const EntityGridSkeleton = ({
  count = 6,
  aspect = 'aspect-4/5',
}: {
  count?: number;
  aspect?: string;
}) => (
  <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
      <div key={i}>
        <Skeleton className={`${aspect} w-full rounded-xl`} />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export default EntityGridSkeleton;
