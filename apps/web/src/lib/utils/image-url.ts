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

/**
 * 영상의 정지 썸네일 이미지 URL — Cloudflare Stream / YouTube 지원.
 * OG 이미지 등 영상 미리보기가 필요할 때 사용. 미지원 provider면 null.
 * - Cloudflare Stream: `<base>/thumbnails/thumbnail.jpg`
 * - YouTube: `img.youtube.com/vi/<id>/maxresdefault.jpg`
 */
export function getVideoThumbnailUrl(
  url: string | null | undefined,
  opts: { width?: number; height?: number; time?: string } = {}
): string | null {
  if (!url) return null;
  const { width = 1200, height = 630, time = '1s' } = opts;

  // Cloudflare Stream: https://customer-<code>.cloudflarestream.com/<uid>
  if (url.includes('cloudflarestream.com')) {
    const base = url.replace(/\/manifest\/.*$/, '').replace(/\/+$/, '');
    return `${base}/thumbnails/thumbnail.jpg?time=${time}&width=${width}&height=${height}&fit=crop`;
  }

  // YouTube
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/
  );
  if (yt?.[1]) return `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;

  return null;
}
