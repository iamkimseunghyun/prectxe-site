import { Metadata } from 'next';
import getSession from '@/lib/session';
import { prisma } from '@/lib/db/prisma';
import ArtworkFormView from '@/modules/artworks/ui/views/artwork-form-view';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      mainImageUrl: true,
    },
  });

  return (
    <ArtworkFormView mode={'create'} userId={session.id} artists={artists} />
  );
};

export default Page;
