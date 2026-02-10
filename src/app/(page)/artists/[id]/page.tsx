import { Edit, Globe } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminButton from '@/components/layout/admin-button';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import canManage from '@/lib/auth/make-login';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { formatArtistName } from '@/lib/utils';
import { getArtistById } from '@/modules/artists/server/actions';
import ArtworkListSection from '@/modules/artworks/ui/section/artwork-list-section';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({
    where: { id: id },
    select: {
      name: true,
      nameKr: true,
      biography: true,
      mainImageUrl: true,
      city: true,
      country: true,
    },
  });

  if (!artist) {
    return {
      title: 'Artist Not Found',
    };
  }

  const description =
    artist.biography ||
    `${artist.nameKr} (${artist.name}) - ${artist.city ? `${artist.city}, ` : ''}${artist.country || ''}`;

  return {
    title: `${artist.nameKr} (${artist.name})`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${artist.nameKr} (${artist.name})`,
      description: description.slice(0, 160),
      images: artist.mainImageUrl ? [{ url: artist.mainImageUrl }] : undefined,
    },
  };
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const artist = await getArtistById(id);
  const session = await getSession();

  if (!artist) {
    notFound();
  }

  const canEdit = await canManage(session.id!, artist.userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <BreadcrumbNav
        entityType="artist"
        title={formatArtistName(artist.nameKr as any, artist.name as any)}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {/* 프로필 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <div className="space-y-1">
                  <p>
                    {artist.nameKr
                      ? `${artist.nameKr} (${artist.name})`
                      : artist.name}
                  </p>
                </div>
              </CardTitle>
              {canEdit && (
                <Link href={`/artists/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    프로필 수정
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {artist.mainImageUrl && (
              <div className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={`${artist.mainImageUrl}/smaller`}
                  alt={formatArtistName(
                    artist.nameKr as any,
                    artist.name as any
                  )}
                  fill
                  priority
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                  className="object-cover"
                />
              </div>
            )}

            <div className="space-y-2">
              {/*{artist.email && (*/}
              {/*  <div className="flex items-center text-sm text-muted-foreground">*/}
              {/*    <Mail className="mr-2 h-4 w-4" />*/}
              {/*    <a*/}
              {/*      href={`mailto:${artist.email}`}*/}
              {/*      className="hover:underline"*/}
              {/*    >*/}
              {/*      {artist.email}*/}
              {/*    </a>*/}
              {/*  </div>*/}
              {/*)}*/}
              {artist.homepage && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="mr-2 h-4 w-4" />
                  <a
                    href={artist.homepage!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {artist.homepage}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상세 정보 탭 */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="biography" className="space-y-4">
              <TabsList>
                <TabsTrigger value="biography">소개</TabsTrigger>
                <TabsTrigger value="cv">이력</TabsTrigger>
              </TabsList>
              <TabsContent value="biography" className="space-y-4">
                {artist.biography && (
                  <div className="prose max-w-none whitespace-pre-line">
                    {artist.biography}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="cv" className="space-y-4">
                {artist.cv && (
                  <div className="prose max-w-none whitespace-pre-line">
                    {artist.cv}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 작품 목록 */}

        {artist.artistArtworks.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>작품</CardTitle>
                {canEdit && (
                  <Link href={`/artworks/new`}>
                    <Button variant="outline" size="sm">
                      작품 등록
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ArtworkListSection artistId={id} />
            </CardContent>
          </Card>
        )}
      </div>
      {canEdit && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={id} entityType="artist" />
        </div>
      )}
    </div>
  );
};

export default Page;
