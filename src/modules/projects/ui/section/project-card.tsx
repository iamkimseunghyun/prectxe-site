import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    about: string;
    year: number;
    category: string;
    mainImageUrl: string;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  // 카테고리 한글 매핑
  const categoryLabel = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크숍',
  }[project.category];

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        {/* 이미지 섹션 */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {project.mainImageUrl ? (
            <Image
              src={`${project.mainImageUrl}/thumbnail`}
              alt={project.title}
              fill
              priority // For above-the-fold images (first few cards)
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span>No image</span>
            </div>
          )}
        </div>

        {/* 콘텐츠 섹션 */}
        <div className="p-5">
          {/* 메타 정보 */}
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary">{project.year}년</Badge>
            <Badge variant="outline">{categoryLabel}</Badge>
          </div>

          {/* 제목 */}
          <h3 className="mb-2 line-clamp-1 text-lg font-semibold transition-colors group-hover:text-blue-600">
            {project.title}
          </h3>

          {/* 설명 */}
          <p className="line-clamp-2 text-sm text-gray-600">{project.about}</p>
        </div>
      </Card>
    </Link>
  );
}
