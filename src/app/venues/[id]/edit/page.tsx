import VenueForm from '@/components/venue/venue-form';
import { getVenue } from '@/app/venues/actions';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initialData = await getVenue(id);
  if (!initialData) {
    return <div>Venue not found</div>;
  }

  return <VenueForm mode={'edit'} initialData={initialData} venueId={id} />;
};

export default Page;
