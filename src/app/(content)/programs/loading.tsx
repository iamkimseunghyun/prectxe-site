import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-40 rounded bg-gray-100" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-100" />
      </div>
      <GridSkeleton />
    </div>
  );
}
