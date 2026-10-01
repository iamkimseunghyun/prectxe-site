import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { listProgramsPaged } from '@/modules/programs/server/actions';
import { ProgramTable } from '../components/program-table';

interface ProgramAdminListViewProps {
  page: number;
}

export async function ProgramAdminListView({
  page,
}: ProgramAdminListViewProps) {
  const { items, total, pageSize } = await listProgramsPaged({
    page,
    pageSize: 10,
    includeDrafts: true,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <AdminHeader
        title="Programs"
        description="프로그램을 생성하고 관리합니다."
        actionLabel="새 프로그램"
        actionHref="/admin/programs/new"
      />
      <ProgramTable data={items} />
      <AdminPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
      />
    </div>
  );
}
