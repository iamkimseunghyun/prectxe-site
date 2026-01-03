import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getImageUrl } from '@/lib/utils';
import { getArticleBySlug } from '@/modules/journal/server/actions';
import { JournalDetailView } from '@/modules/journal/ui/views/journal-detail-view';

export async function generateStaticParams() {
  const articles = await prisma.article.findMany({ select: { slug: true } });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Journal — Not Found' };
  const title = `${article.title} — PRECTXE`;
  const description = article.excerpt || undefined;
  const url = `https://prectxe.com/journal/${article.slug}`;
  const cover = article.cover
    ? getImageUrl(article.cover, 'public')
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  return <JournalDetailView slug={slug} />;
};

export default Page;
