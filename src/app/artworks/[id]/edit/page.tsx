import ArtworkForm from '@/components/artwork/artwork-form';
import { getArtworkById } from '@/app/artworks/[id]/actions';

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
