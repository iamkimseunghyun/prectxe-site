import ArtistForm from '@/components/artist/artist-form';

import { Metadata } from 'next';
import { getArtistById } from '@/app/artists/actions';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: {
    index: false,
    follow: false,
  },
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;

  const initialData = await getArtistById(id);

  if (!initialData) {
    return <div>Project not found</div>;
  }
  return (
    <div>
      <ArtistForm mode={'edit'} initialData={initialData} artistId={id} />
    </div>
  );
};

export default Page;
