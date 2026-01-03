import { getArtistById } from '@/modules/artists/server/actions';
import ArtistFormView from '@/modules/artists/ui/views/artist-form-view';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;

  const initialData = await getArtistById(id);

  if (!initialData) {
    return <div>Project not found</div>;
  }
  return (
    <div>
      <ArtistFormView mode={'edit'} initialData={initialData} artistId={id} />
    </div>
  );
};

export default Page;
