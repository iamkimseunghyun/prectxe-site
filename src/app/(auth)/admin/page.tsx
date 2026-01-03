import {
  Archive,
  FileText,
  Image as ImageIcon,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { AdminStatsCard } from '@/components/admin/admin-stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db/prisma';

export default async function Page() {
  // Stats (safe fallbacks when DB empty or unavailable)
  const counts = await Promise.allSettled([
    prisma.program.count(),
    prisma.article.count(),
    prisma.artist.count(),
    prisma.venue.count(),
    prisma.artwork.count(),
  ]);

  const getNum = (i: number) =>
    counts[i].status === 'fulfilled' ? counts[i].value : 0;

  const stats = [
    {
      title: 'Programs',
      value: getNum(0),
      icon: Archive,
      href: '/admin/programs',
    },
    {
      title: 'Journal',
      value: getNum(1),
      icon: FileText,
      href: '/admin/journal',
    },
    {
      title: 'Artists',
      value: getNum(2),
      icon: Users,
      href: '/admin/artists',
    },
    {
      title: 'Venues',
      value: getNum(3),
      icon: MapPin,
      href: '/admin/venues',
    },
    {
      title: 'Artworks',
      value: getNum(4),
      icon: ImageIcon,
      href: '/admin/artworks',
    },
  ];

  // Recent activity
  let recentPrograms: {
    id: string;
    title: string;
    type: string;
    status: string;
    updatedAt: Date;
  }[] = [];

  let recentArticles: {
    slug: string;
    title: string;
    publishedAt: Date | null;
    updatedAt: Date;
  }[] = [];

  try {
    [recentPrograms, recentArticles] = await Promise.all([
      prisma.program.findMany({
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.article.findMany({
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
        select: { slug: true, title: true, publishedAt: true, updatedAt: true },
      }),
    ]);
  } catch {
    // Silent fail for empty DB
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <AdminStatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
            />
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Programs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">최근 수정된 프로그램</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPrograms.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                아직 등록된 프로그램이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {recentPrograms.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.type} · {p.status}
                      </p>
                    </div>
                    <Link
                      href={`/admin/programs/${p.id}/edit`}
                      className="ml-2 shrink-0 text-xs text-blue-600 hover:underline"
                    >
                      편집
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Journal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">최근 수정된 글</CardTitle>
          </CardHeader>
          <CardContent>
            {recentArticles.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                아직 등록된 글이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {recentArticles.map((a) => (
                  <div
                    key={a.slug}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.publishedAt
                          ? new Date(a.publishedAt).toLocaleDateString('ko-KR')
                          : '미발행'}
                      </p>
                    </div>
                    <Link
                      href={`/admin/journal/${a.slug}/edit`}
                      className="ml-2 shrink-0 text-xs text-blue-600 hover:underline"
                    >
                      편집
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
