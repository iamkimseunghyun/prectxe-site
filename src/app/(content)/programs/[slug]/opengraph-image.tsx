import { ImageResponse } from 'next/og';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import { getImageUrl } from '@/lib/utils';

export const alt = 'PRECTXE Program';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_LABELS: Record<string, string> = {
  exhibition: 'EXHIBITION',
  live: 'LIVE',
  party: 'PARTY',
  workshop: 'WORKSHOP',
  talk: 'TALK',
};

function formatDateRange(startAt: string, endAt: string | null): string {
  const start = new Date(startAt);
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const startStr = start.toLocaleDateString('en-US', opts);
  if (!endAt) return startStr;
  const end = new Date(endAt);
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startStr} – ${end.toLocaleDateString('en-US', opts)}`;
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  const notoSansKr = await fetch(
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap'
  )
    .then((res) => res.text())
    .then((css) => {
      const match = css.match(/src: url\(([^)]+)\) format\('woff2'\)/);
      return match ? fetch(match[1]).then((r) => r.arrayBuffer()) : null;
    });

  if (!program) {
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
        PRECTXE
      </div>,
      {
        ...size,
        fonts: notoSansKr
          ? [{ name: 'Noto Sans KR', data: notoSansKr, weight: 700 as const }]
          : [],
      }
    );
  }

  const heroSrc = program.heroUrl
    ? getImageUrl(program.heroUrl, 'public')
    : null;
  const typeLabel = TYPE_LABELS[program.type] || program.type.toUpperCase();
  const dateStr = formatDateRange(program.startAt, program.endAt);

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
      {heroSrc && (
        <img
          src={heroSrc}
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
          background: heroSrc
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
        {/* Top: branding + type */}
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
            {typeLabel}
          </span>
        </div>

        {/* Center: title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: program.title.length > 30 ? 42 : 54,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: '90%',
              wordBreak: 'break-word',
            }}
          >
            {program.title}
          </span>
        </div>

        {/* Bottom: date + venue */}
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
          {program.venue && (
            <span
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 18,
              }}
            >
              {program.venue}
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
