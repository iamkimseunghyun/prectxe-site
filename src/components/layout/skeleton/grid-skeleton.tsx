import ProjectCardSkeleton from '@/components/layout/skeleton/card-skeleton';

const GridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default GridSkeleton;
