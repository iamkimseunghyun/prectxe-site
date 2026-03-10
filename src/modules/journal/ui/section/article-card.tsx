import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/utils';

export function ArticleCard({
  article,
}: {
  article: {
    slug: string;
    title: string;
    cover?: string | null;
    tags?: string[];
    publishedAt: Date | string | null;
  };
}) {
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ko-KR')
    : '';

  return (
    <Link href={`/journal/${article.slug}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Image
          src={getImageUrl(article.cover || null, 'thumbnail')}
          alt={article.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        {article.tags && article.tags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {article.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <h3 className="font-medium text-neutral-900">{article.title}</h3>
        {date && <p className="mt-1 text-sm text-neutral-500">{date}</p>}
      </div>
    </Link>
  );
}
