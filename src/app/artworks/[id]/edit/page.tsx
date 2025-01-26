import ArtworkForm from '@/components/artwork/artwork-form';
import { getArtworkById } from '@/app/artworks/[id]/actions';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: '작품 수정',
  robots: { index: false, follow: false },
};
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const initialData = await getArtworkById(id);
  return (
    <div>
      <ArtworkForm mode={'edit'} initialData={initialData} artworkId={id} />
    </div>
  );
};

export default Page;
