import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import Image from 'next/image';
import { formatArtistName, formatEventDate, getImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CarouselGallery from '@/components/image/carousel-gallery';
import AdminButton from '@/components/layout/admin-button';
import { getProjectWithCache } from '@/modules/projects/server/actions';
import getSession from '@/lib/auth/session';
import canManage from '@/lib/auth/make-login';

export const ProjectDetailView = async ({ id }: { id: string }) => {
  const project = await getProjectWithCache(id);

  if (!project) return null;

  const session = await getSession();

  const canEdit = await canManage(session.id!, project.userId);

  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project.category];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 메인 섹션 */}
      <BreadcrumbNav entityType="project" title={project.title} />
      {project.mainImageUrl ? (
        <div className="relative mb-4 flex aspect-square justify-center overflow-hidden rounded-lg sm:aspect-video md:mb-8">
          <Image
            src={getImageUrl(project.mainImageUrl, 'public')}
            alt={project.title}
            fill
            priority
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
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
                      fill
                      alt={formatArtistName(
                        artist.nameKr as any,
                        artist.name as any
                      )}
                    />
                  ) : (
                    <AvatarFallback>
                      {(artist.name || '')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-center font-medium group-hover:text-accent-foreground">
                  {formatArtistName(artist.nameKr as any, artist.name as any)}
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
