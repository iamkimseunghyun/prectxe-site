export const getImageUrl = (
  url: string | null | undefined,
  variant: 'thumbnail' | 'public' | 'smaller' | 'hires'
) => {
  if (!url) return '/images/placeholder.png';
  const baseUrl = url.replace(/\/(thumbnail|smaller|public)$/, '');
  return `${baseUrl}/${variant}`;
};

export function extractImageId(url: string) {
  const regex = /imagedelivery\.net\/[^/]+\/([^/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export function extractVideoId(url: string | null): string | null {
  if (!url) return null;
  const regex = /cloudflarestream\.com\/([a-f0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
