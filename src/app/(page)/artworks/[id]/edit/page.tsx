import { Metadata } from 'next';

import { prisma } from '@/lib/db/prisma';
import ArtworkFormView from '@/modules/artworks/ui/views/artwork-form-view';
import { getArtworkById } from '@/modules/artworks/server/actions';
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
    <ArtworkFormView
      mode={'edit'}
      initialData={initialData}
      artworkId={id}
      artists={artists}
    />
  );
};

export default Page;
