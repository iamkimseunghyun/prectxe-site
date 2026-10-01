export type GAItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetIdOrName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

const CURRENCY = 'KRW';

function sendEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', name, params);
}

export function trackViewItem(params: {
  id: string;
  name: string;
  category?: string;
  price: number;
}) {
  sendEvent('view_item', {
    currency: CURRENCY,
    value: params.price,
    items: [
      {
        item_id: params.id,
        item_name: params.name,
        item_category: params.category,
        price: params.price,
        quantity: 1,
      },
    ],
  });
}

export function trackBeginCheckout(value: number, items: GAItem[]) {
  sendEvent('begin_checkout', {
    currency: CURRENCY,
    value,
    items,
  });
}

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  items: GAItem[];
}) {
  sendEvent('purchase', {
    transaction_id: params.transactionId,
    currency: CURRENCY,
    value: params.value,
    items: params.items,
  });
}
