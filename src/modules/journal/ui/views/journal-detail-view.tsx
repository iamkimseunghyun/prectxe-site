import Image from 'next/image';
import Link from 'next/link';
import ArticleSchema from '@/components/seo/article-schema';
import { BackButton } from '@/components/shared/back-button';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
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

  const cover = getImageUrl(article.cover || null, 'public');
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ko-KR')
    : undefined;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <BackButton />
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
      <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
        <Image src={cover} alt={article.title} fill className="object-cover" />
      </div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{article.title}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          {date && <span>{date}</span>}
          <CopyUrlButton className="ml-auto text-xs text-neutral-400 hover:text-neutral-600" />
        </div>
      </header>

      {article.body && (
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{article.body}</p>
        </section>
      )}

      <div className="mt-12 flex items-center justify-center gap-4 border-t pt-8 text-xs sm:gap-6 sm:text-sm md:text-base">
        <Link
          href="/"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Home
        </Link>
        <Link
          href="/programs"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Archive
        </Link>
        <Link
          href="/journal"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Journal
        </Link>
        <Link
          href="/about"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          About
        </Link>
      </div>
    </article>
  );
}
