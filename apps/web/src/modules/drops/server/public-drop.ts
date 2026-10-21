import { toPublicTier, toPublicVariant } from '@/lib/utils/ticket-status';
import type { getDropBySlug } from '@/modules/drops/server/actions';

/**
 * 드랍 상세 페이지가 클라이언트 컴포넌트로 넘기는 데이터를 만든다.
 *
 * **allow-list**다 — 뷰가 쓰는 필드만 골라 담는다. DB 행을 `...rest`로 통째로 넘기면
 * 나중에 쿼리가 필드를 더 가져오거나 컬럼이 늘 때 코드 변경 없이 페이지 소스로 샌다.
 * 정확한 판매·재고 수량(`quantity`·`stock`·`soldCount`)은 여기서 파생값으로만 바꿔 보낸다
 * (`toPublicTier`·`toPublicVariant`).
 */
type DropWithRelations = NonNullable<Awaited<ReturnType<typeof getDropBySlug>>>;

function pickMedia(drop: DropWithRelations) {
  return drop.media.map((m) => ({
    id: m.id,
    type: m.type,
    url: m.url,
    alt: m.alt,
    order: m.order,
  }));
}

function pickCredits(drop: DropWithRelations) {
  return drop.credits.map((c) => ({
    dropId: c.dropId,
    artistId: c.artistId,
    role: c.role,
    artist: {
      id: c.artist.id,
      name: c.artist.name,
      nameKr: c.artist.nameKr,
      mainImageUrl: c.artist.mainImageUrl,
    },
  }));
}

export function toPublicTicketDrop(drop: DropWithRelations) {
  return {
    id: drop.id,
    slug: drop.slug,
    title: drop.title,
    summary: drop.summary,
    description: drop.description,
    eventDate: drop.eventDate,
    eventEndDate: drop.eventEndDate,
    venue: drop.venue,
    venueAddress: drop.venueAddress,
    notice: drop.notice,
    media: pickMedia(drop),
    credits: pickCredits(drop),
    ticketTiers: drop.ticketTiers.map((tier) => toPublicTier(tier, drop)),
  };
}

export function toPublicGoodsDrop(drop: DropWithRelations) {
  return {
    id: drop.id,
    slug: drop.slug,
    title: drop.title,
    summary: drop.summary,
    description: drop.description,
    notice: drop.notice,
    eventDate: drop.eventDate,
    eventEndDate: drop.eventEndDate,
    media: pickMedia(drop),
    credits: pickCredits(drop),
    variants: drop.variants.map(toPublicVariant),
  };
}
