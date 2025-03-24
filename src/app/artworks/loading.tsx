import { ArtistListSkeleton } from '@/components/page/artist/artist-list-skeleton';

const Loading = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ArtistListSkeleton />
    </div>
  );
};

export default Loading;
