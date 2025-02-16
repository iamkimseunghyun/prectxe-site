import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit, Globe, Mail } from 'lucide-react';

import Link from 'next/link';

import WorkList from '@/components/page/artwork/work-list';
import { getArtistById } from '@/app/artists/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';
import EventList from '@/components/page/event/event-list';
import BreadcrumbNav from '@/components/breadcrum-nav';
import canManage from '@/lib/can-manage';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const artist = await getArtistById(id);
  const session = await getSession();

  if (!artist) {
    notFound();
  }

  const canEdit = await canManage(session.id!, artist.userId);

  return (
    <div className="mx-auto max-w-5xl py-10">
      <BreadcrumbNav entityType="artist" title={artist.name} />
      <div className="grid gap-6 md:grid-cols-2">
        {/* 프로필 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{artist.name}</CardTitle>
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
                  src={`${artist.mainImageUrl}/public`}
                  alt={artist.name!}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            )}

            <div className="space-y-2">
              {artist.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  <a
                    href={`mailto:${artist.email}`}
                    className="hover:underline"
                  >
                    {artist.email}
                  </a>
                </div>
              )}
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
            <WorkList artistId={id} />
          </CardContent>
        </Card>

        {/* 이벤트 목록 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>이벤트</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EventList />
          </CardContent>
        </Card>
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
