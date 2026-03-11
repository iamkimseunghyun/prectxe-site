import { ImageResponse } from 'next/og';
import { getImageUrl } from '@/lib/utils';
import { getArticleBySlug } from '@/modules/journal/server/actions';

export const alt = 'PRECTXE Journal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  const notoSansKr = await fetch(
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap'
  )
    .then((res) => res.text())
    .then((css) => {
      const match = css.match(/src: url\(([^)]+)\) format\('woff2'\)/);
      return match ? fetch(match[1]).then((r) => r.arrayBuffer()) : null;
    });

  if (!article) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontSize: 48,
          fontFamily: '"Noto Sans KR", sans-serif',
        }}
      >
        PRECTXE Journal
      </div>,
      {
        ...size,
        fonts: notoSansKr
          ? [{ name: 'Noto Sans KR', data: notoSansKr, weight: 700 as const }]
          : [],
      }
    );
  }

  const coverSrc = article.cover ? getImageUrl(article.cover, 'public') : null;
  const tags = article.tags || [];
  const dateStr = article.publishedAt ? formatDate(article.publishedAt) : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#000',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      {/* Background image */}
      {coverSrc && (
        <img
          src={coverSrc}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          background: coverSrc
            ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)'
            : 'transparent',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 64px',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Top: branding + JOURNAL label */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 20,
              letterSpacing: '0.15em',
              opacity: 0.7,
            }}
          >
            PRECTXE
          </span>
          <span
            style={{
              color: '#fff',
              fontSize: 16,
              letterSpacing: '0.2em',
              padding: '6px 16px',
              border: '1px solid rgba(255,255,255,0.4)',
            }}
          >
            JOURNAL
          </span>
        </div>

        {/* Center: title + tags */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: article.title.length > 30 ? 42 : 54,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: '90%',
              wordBreak: 'break-word',
            }}
          >
            {article.title}
          </span>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 16,
                    padding: '4px 14px',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: date + author */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 20,
            }}
          >
            {dateStr}
          </span>
          {article.author?.username && (
            <span
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 18,
              }}
            >
              {article.author.username}
            </span>
          )}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: notoSansKr
        ? [{ name: 'Noto Sans KR', data: notoSansKr, weight: 700 as const }]
        : [],
    }
  );
}
