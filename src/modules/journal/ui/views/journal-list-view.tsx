import { listArticles } from '@/modules/journal/server/actions';
import { ArticleCard } from '@/modules/journal/ui/section/article-card';

export async function JournalListView() {
  const { data } = await listArticles();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Journal</h1>

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
