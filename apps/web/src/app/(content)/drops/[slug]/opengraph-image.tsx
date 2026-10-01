import { ImageResponse } from 'next/og';
import { loadNotoSansKrBold } from '@/lib/og-font';
import { getImageUrl, getVideoThumbnailUrl } from '@/lib/utils';
import { getEffectiveDropStatus } from '@/lib/utils/ticket-status';
import { getDropBySlug } from '@/modules/drops/server/actions';

export const alt = 'PRECTXE Drop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_LABELS: Record<string, string> = {
  ticket: 'TICKET',
  goods: 'GOODS',
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = await getDropBySlug(slug);

  const notoSansKr = await loadNotoSansKrBold();

  // OG는 상단 히어로(media[0])를 그대로 미러링한다.
  // - 히어로 이미지 → 그 이미지
  // - 히어로 영상 → 해당 영상의 Stream/YouTube 썸네일
  const heroMedia = drop?.media[0] ?? null;
  const heroSrc =
    heroMedia?.type === 'image'
      ? getImageUrl(heroMedia.url, 'public')
      : heroMedia?.type === 'video'
        ? getVideoThumbnailUrl(heroMedia.url)
        : null;

  // drop 없거나, 히어로가 없거나, 영상 썸네일을 만들 수 없으면 PRECTXE 디폴트 OG
  if (!drop || !heroSrc) {
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

  const typeLabel = TYPE_LABELS[drop.type] || 'DROP';
  const effectiveStatus = getEffectiveDropStatus(drop);

  // 최저 가격 계산
  const prices =
    drop.type === 'ticket'
      ? drop.ticketTiers.map((t) => t.price)
      : drop.variants.map((v) => v.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const priceLabel =
    minPrice !== null
      ? minPrice === 0
        ? 'FREE'
        : `${minPrice.toLocaleString()}원~`
      : '';

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
      {heroSrc && (
        // biome-ignore lint/performance/noImgElement: next/og ImageResponse(Satori)는 next/image를 지원하지 않음 — 원시 img 필요
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
        {/* Top */}
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
              fontSize: drop.title.length > 30 ? 42 : 54,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: '90%',
              wordBreak: 'break-word',
            }}
          >
            {drop.title}
          </span>
          {drop.summary && (
            <span
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 24,
                maxWidth: '80%',
              }}
            >
              {drop.summary.length > 60
                ? `${drop.summary.slice(0, 60)}…`
                : drop.summary}
            </span>
          )}
        </div>

        {/* Bottom: price */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {priceLabel && (
            <span
              style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {priceLabel}
            </span>
          )}
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 18,
            }}
          >
            {effectiveStatus === 'on_sale'
              ? 'NOW AVAILABLE'
              : effectiveStatus === 'sold_out'
                ? 'SOLD OUT'
                : effectiveStatus === 'upcoming'
                  ? 'COMING SOON'
                  : 'CLOSED'}
          </span>
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
