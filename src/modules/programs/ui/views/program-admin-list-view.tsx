import { listProgramsPaged } from '@/modules/programs/server/actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { ProgramTable } from '../components/program-table';

export async function ProgramAdminListView() {
  const { items } = await listProgramsPaged({ page: 1, pageSize: 100 });

  return (
    <div>
      <AdminHeader
        title="Programs"
        description="프로그램을 생성하고 관리합니다."
        actionLabel="새 프로그램"
        actionHref="/admin/programs/new"
      />
      <ProgramTable data={items} />
    </div>
  );
}
