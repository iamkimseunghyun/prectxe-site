import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import Image from 'next/image';
import { formatEventDate, getImageUrl } from '@/lib/utils';
import React from 'react';
import CarouselGallery from '@/components/image/carousel-gallery';
import { getProjectWithCache } from '@/app/projects/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import canManage from '@/lib/can-manage';
import { Metadata } from 'next';
import BreadcrumbNav from '@/components/breadcrum-nav';
import { prisma } from '@/lib/db/prisma';
import { format } from 'date-fns';

// src/app/projects/[id]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectWithCache(id);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  const artists = project.projectArtists
    .map((pa) => `${pa.artist.nameKr} (${pa.artist.name})`)
    .join(', ');

  const venues = project.venues
    .map((v) => `${v.venue.name} (${v.venue.address})`)
    .join(', ');

  return {
    title: project.title,
    description: `${project.about} - ${project.description.slice(0, 100)}`,
    openGraph: {
      title: project.title,
      description: project.description.slice(0, 160),
      images: project.mainImageUrl
        ? [{ url: project.mainImageUrl }]
        : undefined,
      type: 'article',
    },
    other: {
      'project:category': project.category,
      'project:year': project.year.toString(),
      'project:artists': artists,
      'project:venues': venues,
      'project:duration': `${format(project.startDate, 'yyyy-MM-dd')} - ${format(project.endDate, 'yyyy-MM-dd')}`,
    },
  };
}

export async function generateStaticParams() {
  const projects = await prisma.project.findMany({
    select: { id: true },
  });

  return projects.map((project) => ({
    id: project.id,
  }));
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const project = await getProjectWithCache(id);

  if (!project) return null;

  const session = await getSession();

  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project.category];

  const canEdit = await canManage(session.id!, project.userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 메인 섹션 */}
      <BreadcrumbNav entityType="project" title={project.title} />
      {project.mainImageUrl ? (
        <div className="relative mb-4 flex aspect-square justify-center overflow-hidden rounded-lg sm:aspect-video md:mb-8">
          <Image
            src={getImageUrl(project.mainImageUrl, 'public')}
            alt={project.title}
            width={1200}
            height={1200}
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <p>No Image</p>
      )}
      <div className="mb-4 flex items-center gap-2">
        <Badge variant="outline">{project.year}년</Badge>
        <Badge>{categoryLabel}</Badge>
      </div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{project.title}</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          {formatEventDate(
            new Date(project.startDate || new Date()),
            new Date(project.endDate || new Date())
          )}
        </span>
      </div>
      <p className="mb-12 mt-8 whitespace-pre-wrap text-lg text-muted-foreground">
        {project.about}
      </p>

      {/* 참여 아티스트 */}
      {project.projectArtists.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-semibold">아티스트</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {project.projectArtists.map(({ artist }) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="group flex flex-col items-center gap-2 rounded-lg p-4 transition-colors hover:bg-accent"
              >
                <Avatar className="h-20 w-20">
                  {artist.mainImageUrl &&
                  getImageUrl(artist.mainImageUrl, 'thumbnail') ? (
                    <Image
                      src={getImageUrl(artist.mainImageUrl, 'thumbnail')!}
                      width={100}
                      height={100}
                      alt={artist.name}
                    />
                  ) : (
                    <AvatarFallback>
                      {artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-center font-medium group-hover:text-accent-foreground">
                  {artist.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 상세 정보 */}
      <section className="mb-12">
        <h2 className="flex items-center gap-2 text-3xl font-semibold">
          상세 정보
        </h2>
        <div className="prose max-w-none whitespace-pre-wrap pt-6">
          {project.description}
        </div>
      </section>

      {/* 갤러리 탭 */}
      {project.images.length > 0 && (
        <section className="mb-12">
          <div className="mx-auto">
            <CarouselGallery images={project.images} />
          </div>
        </section>
      )}

      {/* 어드민 버튼 */}
      {canEdit && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={project.id} entityType="project" />
        </div>
      )}
    </div>
  );
};

export default Page;
