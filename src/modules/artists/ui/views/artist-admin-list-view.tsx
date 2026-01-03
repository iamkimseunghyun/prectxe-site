import { prisma } from '@/lib/db/prisma';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArtistTable } from '../components/artist-table';

export async function ArtistAdminListView() {
  const artists = await prisma.artist.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, nameKr: true, city: true, country: true },
    take: 100,
  });

  return (
    <div>
      <AdminHeader
        title="Artists"
        description="아티스트를 등록하고 관리합니다."
        actionLabel="새 아티스트"
        actionHref="/artists/new"
      />
      <ArtistTable data={artists} />
    </div>
  );
}
