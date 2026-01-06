import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { listArtistsPaged } from '@/modules/artists/server/actions';
import { ArtistTable } from '../components/artist-table';

interface ArtistAdminListViewProps {
  page: number;
}

export async function ArtistAdminListView({ page }: ArtistAdminListViewProps) {
  const { items, total, pageSize } = await listArtistsPaged({
    page,
    pageSize: 10,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <AdminHeader
        title="Artists"
        description="아티스트를 등록하고 관리합니다."
        actionLabel="새 아티스트"
        actionHref="/artists/new"
      />
      <ArtistTable data={items} />
      <AdminPagination currentPage={page} totalPages={totalPages} totalItems={total} />
    </div>
  );
}
