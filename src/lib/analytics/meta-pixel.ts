import type { GAItem } from './gtag';

declare global {
  interface Window {
    fbq?: (
      command: 'init' | 'track' | 'trackCustom',
      eventNameOrId: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

const CURRENCY = 'KRW';

function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.fbq?.('track', event, params);
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
