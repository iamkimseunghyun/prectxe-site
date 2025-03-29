import VenueForm from '@/components/page/venue/venue-form';

import { Metadata } from 'next';
import { getVenueById } from '@/app/(page)/venues/actions';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = {
  title: '장소 프로필 수정',
  robots: {
    index: false,
    follow: false,
  },
};

export async function generateStaticParams() {
  const venues = await prisma.venue.findMany({
    select: { id: true },
  });

  return venues.map((venue) => ({
    id: venue.id,
  }));
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initialData = await getVenueById(id);
  if (!initialData) {
    return <div>Venue not found</div>;
  }

  return <VenueForm mode={'edit'} initialData={initialData} venueId={id} />;
};

export default Page;
