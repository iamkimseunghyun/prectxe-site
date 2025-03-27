import ProjectCardSkeleton from '@/components/page/project/project-card-skeleton';

const Loading = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ProjectCardSkeleton />
    </div>
  );
};

export default Loading;
