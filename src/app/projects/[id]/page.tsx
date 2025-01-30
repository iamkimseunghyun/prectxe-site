import { Badge } from '@/components/ui/badge';
import { Calendar, House, ImageIcon, Info, MapPin, Users } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import ProjectAdminButton from '@/components/project/project-admin-button';
import React from 'react';
import CarouselGallery from '@/components/image/carousel-gallery';
import { Metadata } from 'next';
import { getProjectById } from '@/app/projects/actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const project = await getProjectById(id);

  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project!.category];

  return {
    title: project!.title,
    description: project!.description.substring(0, 155) + '...',
    openGraph: {
      title: `${project!.title} - ${categoryLabel} | PRECTXE`,
      description: project!.description.substring(0, 155) + '...',
      images: [
        {
          url: getImageUrl(project!.mainImageUrl, 'public'),
          alt: project!.title,
        },
      ],
    },
  };
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const project = await getProjectById(id);

  if (!project) return null;

  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project.category];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* 메인 섹션 */}
      <div className="mb-8">
        <div className="relative mb-4 aspect-video overflow-hidden rounded-lg">
          <Image
            src={getImageUrl(project.mainImageUrl, 'public')}
            alt={project.title}
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">{project.year}년</Badge>
          <Badge>{categoryLabel}</Badge>
        </div>
        <h1 className="mb-2 text-3xl font-bold">{project.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(project.startDate), 'yyyy.MM.dd')} -{' '}
            {format(new Date(project.endDate), 'yyyy.MM.dd')}
          </span>
          {project.venues.length > 0 && (
            <>
              <MapPin className="h-4 w-4" />
              <span>
                {project.venues.map(({ venueId, venue }) => (
                  <span key={venueId}>{venue.name}</span>
                ))}
              </span>
            </>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-lg text-muted-foreground">
          {project.description}
        </p>
      </div>
      {/* 갤러리 탭 */}
      {project.images.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
            <ImageIcon className="h-5 w-5" />
            갤러리
          </h2>
          <div className="mx-auto">
            <CarouselGallery images={project.images} />
          </div>
        </section>
      )}
      {/* 아티스트 탭 */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <Users className="h-5 w-5" />
          참여 아티스트
        </h2>
        {project.projectArtists && project.projectArtists.length > 0 && (
          <ul className="flex flex-col gap-6 sm:flex-row sm:flex-wrap">
            {project.projectArtists.map(({ artist }) => (
              <li key={artist.id}>
                <Link
                  href={`/artists/${artist.id}`}
                  className="flex items-center gap-4 hover:underline"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={artist.mainImageUrl} alt={artist.name} />
                    <AvatarFallback>{artist.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-medium hover:underline">
                    {artist.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* 작품 탭 */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <ImageIcon className="h-5 w-5" />
          전시 작품
        </h2>
        <ul className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          {project.projectArtworks.map(({ artwork }) => (
            <li key={artwork.id}>
              <Link
                href={`/artworks/${artwork.id}`}
                className="hover:underline"
              >
                <span className="text-lg font-medium">{artwork.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {/* 장소 탭 */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <House className="h-5 w-5" />
          장소
        </h2>
      </section>
      {/* 상세 정보 탭 */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <Info className="h-5 w-5" />
          상세 정보
        </h2>
        <div className="prose max-w-none whitespace-pre-wrap pt-6">
          {project.content}
        </div>
      </section>
      <div className="mt-6 flex justify-end gap-x-2">
        <ProjectAdminButton projectId={project.id} />
      </div>
    </div>
  );
};

export default Page;
