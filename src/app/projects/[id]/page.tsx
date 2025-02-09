import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import React from 'react';
import CarouselGallery from '@/components/image/carousel-gallery';
import { getProjectById } from '@/app/projects/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const project = await getProjectById(id);

  if (!project) return null;

  const session = await getSession();

  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project.category];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
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
        </div>
        <p className="mt-4 whitespace-pre-wrap text-lg text-muted-foreground">
          {project.about}
        </p>
      </div>

      {/* 상세 정보 */}
      <section className="mb-12">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
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
      {session.id && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={project.id} entityType="project" />
        </div>
      )}
    </div>
  );
};

export default Page;
