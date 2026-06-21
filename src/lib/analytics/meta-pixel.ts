import type { GAItem } from './gtag';

declare global {
  interface Window {
    // consent/set/dataProcessingOptions 등 표준 커맨드까지 허용하도록 string으로 유지
    fbq?: (
      command: string,
      eventNameOrId: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

const CURRENCY = 'KRW';
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type QueuedEvent = { event: string; params?: Record<string, unknown> };

// 광고로 상세 페이지에 직접 랜딩하면 afterInteractive로 로드되는 Pixel 스텁이
// 초기화되기 전에 ViewContent 등이 호출돼 이벤트가 유실될 수 있다.
// fbq가 준비될 때까지 임시 큐에 모았다가 flush한다.
const pending: QueuedEvent[] = [];
let draining = false;

function flushWhenReady() {
  if (draining) return;
  draining = true;
  const start = Date.now();
  const timer = setInterval(() => {
    if (window.fbq) {
      while (pending.length > 0) {
        const item = pending.shift();
        if (item) window.fbq('track', item.event, item.params);
      }
      clearInterval(timer);
      draining = false;
    } else if (Date.now() - start > 10_000) {
      // 광고 차단기 등으로 로드 실패 시 무한 폴링 방지
      clearInterval(timer);
      draining = false;
      pending.length = 0;
    }
  }, 100);
}

function track(event: string, params?: Record<string, unknown>) {
  // Pixel 미설정이면 추적·큐·폴링 전부 생략 (MetaPixel 컴포넌트도 렌더 안 됨)
  if (!PIXEL_ID) return;
  if (typeof window === 'undefined') return;
  if (window.fbq) {
    window.fbq('track', event, params);
    return;
  }
  pending.push({ event, params });
  flushWhenReady();
}

export function trackMetaPageView() {
  track('PageView');
}

function toContents(items: GAItem[]) {
  return items.map((item) => ({ id: item.item_id, quantity: item.quantity }));
}

export function trackMetaViewContent(params: {
  id: string;
  name: string;
  category?: string;
  price: number;
}) {
  track('ViewContent', {
    content_ids: [params.id],
    content_name: params.name,
    content_category: params.category,
    content_type: 'product',
    value: params.price,
    currency: CURRENCY,
  });
}

export function trackMetaInitiateCheckout(value: number, items: GAItem[]) {
  track('InitiateCheckout', {
    value,
    currency: CURRENCY,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    content_ids: items.map((item) => item.item_id),
    contents: toContents(items),
    content_type: 'product',
  });
}

export function trackMetaPurchase(params: {
  transactionId: string;
  value: number;
  items: GAItem[];
}) {
  track('Purchase', {
    value: params.value,
    currency: CURRENCY,
    content_ids: params.items.map((item) => item.item_id),
    contents: toContents(params.items),
    content_type: 'product',
    order_id: params.transactionId,
  });
}
