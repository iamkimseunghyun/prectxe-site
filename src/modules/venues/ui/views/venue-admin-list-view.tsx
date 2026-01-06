import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { getAllVenues } from '@/modules/venues/server/actions';
import { VenueTable } from '../components/venue-table';

interface VenueAdminListViewProps {
  page: number;
}

export async function VenueAdminListView({ page }: VenueAdminListViewProps) {
  const { venues, total, totalPages } = await getAllVenues(page, 10);

  return (
    <div>
      <AdminHeader
        title="Venues"
        description="장소를 등록하고 관리합니다."
        actionLabel="새 장소"
        actionHref="/venues/new"
      />
      <VenueTable data={venues} />
      <AdminPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
      />
    </div>
  );
}
