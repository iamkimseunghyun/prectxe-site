import { listArticles } from '@/modules/journal/server/actions';
import { ArticleCard } from '@/modules/journal/ui/section/article-card';
import Link from 'next/link';

export async function JournalHighlightsSection() {
  const { data } = await listArticles();
  const items = (data ?? []).slice(0, 3);
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Journal</h2>
              <p className="text-sm text-muted-foreground">
                인터뷰, 노트, 비하인드
              </p>
            </div>
            <Link href="/journal" className="text-sm underline">
              모두 보기
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/journal?tag=인터뷰"
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
            >
              #인터뷰
            </Link>
            <Link
              href="/journal?tag=노트"
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
            >
              #노트
            </Link>
            <Link
              href="/journal?tag=비하인드"
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
            >
              #비하인드
            </Link>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
            준비 중입니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a.slug} article={a as any} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
