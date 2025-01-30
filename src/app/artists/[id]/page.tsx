import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, Globe, Mail, MapPin } from 'lucide-react';

import Link from 'next/link';

import WorksList from '@/components/artwork/works-list';
import ArtistAdminButton from '@/components/artist/artist-admin-button';
import { getArtistById } from '@/app/artists/actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const artist = await getArtistById(id);

  if (!artist) {
    return {
      title: '아티스트를 찾을 수 없습니다',
      description: '요청하신 아티스트 정보를 찾을 수 없습니다.',
    };
  }

  return {
    title: artist.name,
    description: artist.biography.substring(0, 155) + '...', // SEO 권장 길이
    openGraph: {
      title: `${artist.name} - PRECTXE 아티스트`,
      description: artist.biography.substring(0, 155) + '...',
      images: [
        {
          url: `${artist.mainImageUrl}/public`,
          width: 1200,
          height: 630,
          alt: artist.name,
        },
      ],
    },
  };
}

const ArtistPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const artist = await getArtistById(id);

  if (!artist) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 프로필 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{artist.name}</CardTitle>
              <Link href={`/artists/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  프로필 수정
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={`${artist.mainImageUrl}/public`}
                alt={artist.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4" />
                {artist.city}, {artist.country} ({artist.nationality})
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                <a href={`mailto:${artist.email}`} className="hover:underline">
                  {artist.email}
                </a>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Globe className="mr-2 h-4 w-4" />
                <a
                  href={artist.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {artist.homepage}
                </a>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                {formatDate(new Date(artist.birth))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상세 정보 탭 */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="biography" className="space-y-4">
              <TabsList>
                <TabsTrigger value="biography">약력</TabsTrigger>
                <TabsTrigger value="cv">이력서</TabsTrigger>
              </TabsList>
              <TabsContent value="biography" className="space-y-4">
                <div className="prose max-w-none">
                  {artist.biography.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="cv" className="space-y-4">
                <div className="prose max-w-none">
                  {artist.cv.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 작품 목록 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>작품</CardTitle>
              <Link href={`/artists/${id}/works/new`}>
                <Button variant="outline" size="sm">
                  작품 등록
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <WorksList />
          </CardContent>
        </Card>

        {/* 이벤트 목록 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>이벤트</CardTitle>
              <Link href={`/artists/${id}/events/new`}>
                <Button variant="outline" size="sm">
                  이벤트 등록
                </Button>
              </Link>
            </div>
          </CardHeader>
          {/* <CardContent>
            <EventsList events={artist.events} />
          </CardContent>*/}
        </Card>
      </div>
      <div className="mt-6 flex justify-end gap-x-2">
        <ArtistAdminButton artistId={id} />
      </div>
    </div>
  );
};

export default ArtistPage;
