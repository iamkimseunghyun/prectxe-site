import { prisma } from '@/lib/db/prisma';
import { formatArtistName } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Page() {
  const artists = await prisma.artist.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, nameKr: true, city: true, country: true },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Artists</h1>
          <p className="text-sm text-muted-foreground">
            Manage artist profiles.
          </p>
        </div>
        <Link href="/artists/new">
          <Button>새 아티스트</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">이름</th>
              <th className="w-40 p-3">도시</th>
              <th className="w-40 p-3">국가</th>
              <th className="w-24 p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="truncate p-3">
                  {formatArtistName(a.nameKr as any, a.name as any)}
                </td>
                <td className="p-3">{a.city}</td>
                <td className="p-3">{a.country}</td>
                <td className="p-3">
                  <Link
                    href={`/artists/${a.id}/edit`}
                    className="text-blue-600 underline"
                  >
                    편집
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
