import { Calendar, MapPin, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CarouselGallery from '@/components/image/carousel-gallery';
import { Metadata } from 'next';
import { getVenueById } from '@/app/venues/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const venue = await getVenueById(id);

  if (!venue) {
    return {
      title: '장소를 찾을 수 없습니다',
      robots: { index: false },
    };
  }

  return {
    title: venue.name,
    description: venue.description.substring(0, 155) + '...',
    openGraph: {
      title: `${venue.name} - PRECTXE 전시 공간`,
      description: venue.description.substring(0, 155) + '...',
      images: venue.images.map((img) => ({
        url: img.imageUrl,
        alt: img.alt,
      })),
    },
  };
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;

  const venue = await getVenueById(id);
  if (!venue) return;

  const session = await getSession();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Gallery Section */}
      <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-lg">
        <CarouselGallery images={venue.images} />
      </div>

      {/* Main Info Card */}
      <Card className="w-full bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-3xl font-bold">{venue.name}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button>이벤트 보기</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{venue.address}</span>
          </div>

          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed">{venue.description}</p>
          </div>

          {/* Upcoming Events Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Calendar className="h-5 w-5" />
              예정된 이벤트
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Event cards will go here */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-muted-foreground">
                    예정된 이벤트가 없습니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      {session && (
        <div className="mt-12 flex justify-end gap-x-2">
          {/* 섹션 */}
          <AdminButton id={venue.id} entityType="venue" />
        </div>
      )}
    </div>
  );
};

export default Page;
