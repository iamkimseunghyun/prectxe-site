import ArtworkForm from '@/components/page/artwork/artwork-form';

import { Metadata } from 'next';
import { getArtworkById } from '@/app/artworks/actions';
import { prisma } from '@/lib/db/prisma';
export const metadata: Metadata = {
  title: '작품 수정',
  robots: { index: false, follow: false },
};
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const initialData = await getArtworkById(id);
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      mainImageUrl: true,
    },
  });

  return (
    <div>
      <ArtworkForm
        mode={'edit'}
        initialData={initialData}
        artworkId={id}
        artists={artists}
      />
    </div>
  );
};

export default Page;
