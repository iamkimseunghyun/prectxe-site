import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

export function ArticleCard({
  article,
}: {
  article: {
    slug: string;
    title: string;
    cover?: string | null;
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
        <h3 className="font-medium text-neutral-900">{article.title}</h3>
        {date && <p className="mt-1 text-sm text-neutral-500">{date}</p>}
      </div>
    </Link>
  );
}
