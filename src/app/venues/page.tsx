import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import VenueList from '@/components/page/venue/vene-list';
import { getAllVenues } from '@/app/venues/actions';

const VenuesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) => {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const initialData = await getAllVenues(currentPage);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Venues</h1>
        <Link href="/venues/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Venue
          </Button>
        </Link>
      </div>

      <VenueList initialData={initialData} />
    </div>
  );
};

export default VenuesPage;
