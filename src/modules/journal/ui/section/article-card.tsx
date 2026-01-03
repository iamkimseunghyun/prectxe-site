import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

export function ArticleCard({
  article,
}: {
  article: {
    slug: string;
    title: string;
    excerpt?: string | null;
    cover?: string | null;
    publishedAt: Date | string | null;
  };
}) {
  const cover = article.cover ? getImageUrl(article.cover, 'thumbnail') : null;
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ko-KR')
    : '';
  return (
    <Link href={`/journal/${article.slug}`} className="group block">
      <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
        {cover && (
          <Image
            src={cover}
            alt={article.title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        )}
      </div>
      <h3 className="mb-1 line-clamp-1 text-lg font-semibold">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {article.excerpt}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{date}</p>
    </Link>
  );
}
