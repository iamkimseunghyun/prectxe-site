import Link from 'next/link';
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-28">
      <h1 className="mb-8 text-3xl font-bold">Journal</h1>

      {/* 태그 필터 */}
      <div className="mb-8 flex flex-wrap gap-2">
        {TAG_FILTERS.map((f) => {
          const isActive = (tag || '') === f.value;
          return (
            <Link
              key={f.value}
              href={f.value ? `/journal?tag=${f.value}` : '/journal'}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 text-neutral-600 hover:border-neutral-900'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {(!data || data.length === 0) && (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
          게시글이 아직 없습니다.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <ArticleCard key={a.slug} article={a as any} />
        ))}
      </div>
    </div>
  );
}
