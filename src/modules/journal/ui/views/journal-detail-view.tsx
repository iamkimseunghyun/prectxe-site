import Image from 'next/image';
import ArticleSchema from '@/components/seo/article-schema';
import { getImageUrl } from '@/lib/utils';
import { getArticleBySlug } from '@/modules/journal/server/actions';

export async function JournalDetailView({ slug }: { slug: string }) {
  const article = await getArticleBySlug(slug);
  if (!article)
    return (
      <div className="p-8 text-center text-muted-foreground">
        게시글을 찾을 수 없습니다.
      </div>
    );

  const cover = article.cover ? getImageUrl(article.cover, 'public') : null;
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ko-KR')
    : undefined;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <ArticleSchema
        article={{
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          cover,
          publishedAt: article.publishedAt ?? undefined,
          author: article.author ?? undefined,
        }}
      />
      {cover && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
          <Image
            src={cover}
            alt={article.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{article.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          {date}{' '}
          {article.author?.username ? `· ${article.author.username}` : ''}
        </div>
      </header>

      {article.body && (
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <p>{article.body}</p>
        </section>
      )}
    </article>
  );
}
