import Image from 'next/image';
import Link from 'next/link';
import { FilterChip } from '@/components/shared/filter-chip';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/utils';
import { listArticles } from '@/modules/journal/server/actions';
import { ArticleCard } from '@/modules/journal/ui/section/article-card';

const TAG_FILTERS = [
  { value: '', label: '전체' },
  { value: 'tech-note', label: 'Tech Note' },
  { value: 'scene-report', label: 'Scene Report' },
  { value: 'news', label: 'News' },
] as const;

export async function JournalListView({ tag }: { tag?: string }) {
  const { data } = await listArticles({ tag: tag || undefined });
  const articles = data ?? [];
  const [hero, ...rest] = articles;

  return (
    <div className="mx-auto max-w-screen-xl px-4 pb-16 pt-28 md:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
        Journal
      </h1>

      {/* 태그 필터 */}
      <div className="mb-12 flex flex-wrap gap-2">
        {TAG_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            href={f.value ? `/journal?tag=${f.value}` : '/journal'}
            active={(tag || '') === f.value}
          >
            {f.label}
          </FilterChip>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg bg-neutral-50 p-12 text-center text-neutral-500">
          게시글이 아직 없습니다.
        </div>
      ) : (
        <>
          {/* 히어로 아티클 — 비대칭 2컬럼 */}
          <Link
            href={`/journal/${hero.slug}`}
            className="group mb-16 block border-b border-neutral-200 pb-12 md:mb-20 md:pb-16"
          >
            <div className="grid gap-6 md:grid-cols-12 md:gap-10">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-neutral-100 md:col-span-7 md:aspect-[4/3]">
                <Image
                  src={getImageUrl(hero.cover || null, 'public')}
                  alt={hero.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 58vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center md:col-span-5">
                {hero.tags && hero.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {hero.tags.map((t: string) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em]"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <h2 className="text-2xl font-medium leading-tight text-neutral-900 transition-colors group-hover:text-neutral-600 md:text-3xl lg:text-4xl">
                  {hero.title}
                </h2>
                {hero.excerpt && (
                  <p className="mt-4 line-clamp-3 text-base leading-relaxed text-neutral-500 md:text-lg">
                    {hero.excerpt}
                  </p>
                )}
                {hero.publishedAt && (
                  <p className="mt-6 text-sm text-neutral-400">
                    {new Date(hero.publishedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </Link>

          {/* 나머지 아티클 — 3컬럼 그리드 */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a.slug} article={a as any} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
