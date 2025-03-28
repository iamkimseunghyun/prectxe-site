import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      {/* 이미지 스켈레톤 */}
      <Skeleton className="aspect-[16/10] w-full" />

      <div className="p-5">
        {/* 메타 정보 스켈레톤 */}
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>

        {/* 제목 스켈레톤 */}
        <Skeleton className="mb-2 h-6 w-3/4" />

        {/* 설명 스켈레톤 */}
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
};

export default CardSkeleton;
