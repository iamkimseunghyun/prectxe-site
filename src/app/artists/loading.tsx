import { ArtistGridSkeleton } from '@/components/page/artist/artist-grid-skeleton';

const Loading = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ArtistGridSkeleton />
    </div>
  );
};

export default Loading;
