type ArticleForSEO = {
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  cover?: string | null;
  publishedAt?: string | Date | null;
  author?: { username?: string | null } | null;
};

const ArticleSchema = ({ article }: { article: ArticleForSEO }) => {
  const url = `https://prectxe.com/journal/${article.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt || undefined,
    image: article.cover ? [article.cover] : undefined,
    datePublished: article.publishedAt || undefined,
    author: article.author?.username
      ? { '@type': 'Person', name: article.author.username }
      : undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
  };

  const clean = JSON.parse(JSON.stringify(jsonLd));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
};

export default ArticleSchema;
