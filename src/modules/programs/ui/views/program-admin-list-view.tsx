import Link from 'next/link';
import { listProgramsPaged } from '@/modules/programs/server/actions';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/admin/delete-button';

export async function ProgramAdminListView() {
  const { items } = await listProgramsPaged({ page: 1, pageSize: 50 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Programs</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage programs.
          </p>
        </div>
        <Link href="/admin/programs/new">
          <Button>새 프로그램</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">제목</th>
              <th className="w-28 p-3">유형</th>
              <th className="w-24 p-3">상태</th>
              <th className="w-40 p-3">일정</th>
              <th className="w-24 p-3">도시</th>
              <th className="w-40 p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="truncate p-3">{p.title}</td>
                <td className="p-3">{p.type}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">
                  {new Date(p.startAt as any).toLocaleDateString('ko-KR')}
                </td>
                <td className="p-3">{p.city}</td>
                <td className="space-x-2 p-3">
                  <Link
                    href={`/admin/programs/${p.id}/edit`}
                    className="text-blue-600 underline"
                  >
                    편집
                  </Link>
                  <DeleteButton resource="programs" id={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
