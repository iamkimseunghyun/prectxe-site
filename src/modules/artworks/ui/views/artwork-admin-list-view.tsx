import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { listArtworksPaged } from '@/modules/artworks/server/actions';
import { ArtworkTable } from '../components/artwork-table';

interface ArtworkAdminListViewProps {
  page: number;
}

export async function ArtworkAdminListView({ page }: ArtworkAdminListViewProps) {
  const { items, total, pageSize } = await listArtworksPaged({
    page,
    pageSize: 10,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <AdminHeader
        title="Artworks"
        description="작품을 등록하고 관리합니다."
        actionLabel="새 작품"
        actionHref="/artworks/new"
      />
      <ArtworkTable data={items} />
      <AdminPagination currentPage={page} totalPages={totalPages} totalItems={total} />
    </div>
  );
}
