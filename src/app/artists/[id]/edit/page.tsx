import ArtistForm from '@/components/page/artist/artist-form';
import { getArtistById } from '@/app/artists/actions';

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
