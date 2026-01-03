import { listArticles } from '@/modules/journal/server/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/admin/delete-button';

export default async function Page() {
  const { data } = await listArticles();
  const items = data ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground">
            Manage editorial posts.
          </p>
        </div>
        <Link href="/admin/journal/new">
          <Button>새 글</Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">제목</th>
              <th className="w-64 p-3">발행일</th>
              <th className="w-48 p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.slug} className="border-t">
                <td className="truncate p-3">{a.title}</td>
                <td className="p-3">
                  {a.publishedAt
                    ? new Date(a.publishedAt).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td className="space-x-2 p-3">
                  <Link
                    href={`/admin/journal/${a.slug}/edit`}
                    className="text-blue-600 underline"
                  >
                    편집
                  </Link>
                  <DeleteButton resource="journal" id={a.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
