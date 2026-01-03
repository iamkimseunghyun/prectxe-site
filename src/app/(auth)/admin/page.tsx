import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Archive,
  Image as ImageIcon,
  MapPin,
  PlusCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import getSession from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

const Page = async () => {
  const handleLogout = async () => {
    'use server';
    const session = await getSession();
    if (session.id) {
      session.destroy();
    }
    redirect('/');
  };

  // Stats (safe fallbacks when DB empty or unavailable)
  const counts = await Promise.allSettled([
    prisma.program.count(),
    prisma.program.count({ where: { status: 'upcoming' } as any }),
    prisma.program.count({ where: { status: 'completed' } as any }),
    prisma.artist.count(),
    prisma.article.count(),
    prisma.article.count({
      where: {
        publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  const getNum = (i: number) =>
    counts[i].status === 'fulfilled' ? counts[i].value : 0;
  const totalPrograms = getNum(0);
  const upcomingPrograms = getNum(1);
  const completedPrograms = getNum(2);
  const totalArtists = getNum(3);
  const totalArticles = getNum(4);
  const articlesLast30 = getNum(5);

  let recentPrograms: {
    id: string;
    title: string;
    status: string;
    startAt: Date | null;
  }[] = [];
  try {
    recentPrograms = await prisma.program.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
      select: { id: true, title: true, status: true, startAt: true },
    });
  } catch {
    recentPrograms = [];
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <form action={handleLogout}>
          <Button variant="outline">Log Out</Button>
        </form>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Programs</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalPrograms}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({upcomingPrograms} 예정 / {completedPrograms} 완료)
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Artists</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalArtists}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Journal</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalArticles}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              최근 30일 {articlesLast30}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Auth Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Admin
            </CardTitle>
            <CardDescription>
              Manage Admin user and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Manager
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* Programs Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Programs
            </CardTitle>
            <CardDescription>
              Create and manage Programs (exhibition/live/party)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/admin/programs/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Program
                </Button>
              </Link>

              <Link href="/admin/programs">
                <Button className="w-full" variant="outline">
                  Manage Programs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Artists Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Artists
            </CardTitle>
            <CardDescription>
              Manage festival artists and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/artists/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Artist
                </Button>
              </Link>

              <Link href="/admin/artists">
                <Button className="w-full" variant="outline">
                  Manage Artists
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Artworks Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6" />
              Artworks
            </CardTitle>
            <CardDescription>
              Manage artwork collections and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/artworks/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Artwork
                </Button>
              </Link>
              <Link href="/artworks">
                <Button className="w-full" variant="outline">
                  View All Artworks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Journal Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6" />
              Journal
            </CardTitle>
            <CardDescription>Write and manage editorial posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/admin/journal/new">
                <Button className="w-full" variant="outline">
                  New Post
                </Button>
              </Link>
              <Link href="/admin/journal">
                <Button className="w-full" variant="outline">
                  Manage Journal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Programs */}
      <Card>
        <CardHeader>
          <CardTitle>최근 수정된 프로그램</CardTitle>
          <CardDescription>빠르게 이어서 작업하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">제목</th>
                  <th className="w-28 p-3">상태</th>
                  <th className="w-40 p-3">시작일</th>
                  <th className="w-24 p-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {recentPrograms.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="truncate p-3">{p.title}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3">
                      {p.startAt
                        ? new Date(p.startAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/programs/${p.id}/edit`}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
