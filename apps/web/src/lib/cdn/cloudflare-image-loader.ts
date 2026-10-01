import type { ImageLoaderProps } from 'next/image';

const CF_IMAGES_HOST = 'imagedelivery.net';

/** getImageUrl()이 붙이는 명명된 variant — 폭 지정 앞에서 제거한다. */
const NAMED_VARIANT = /\/(thumbnail|smaller|public|hires)$/;

/**
 * Cloudflare Images "flexible variants" 로더.
 *
 * 기존에는 next.config의 `images.unoptimized: true` 때문에 Next가 srcset을
 * 아예 만들지 않았고, 그 결과 코드 곳곳의 `sizes`가 전부 무시되어 375px 폰과
 * 1920px 데스크톱이 동일한 이미지를 받았다. Vercel 이미지 최적화(=과금)를
 * 켜는 대신, Cloudflare가 원본에서 직접 리사이즈하도록 폭을 URL에 실어 보낸다.
 *
 *   .../<id>/smaller            → .../<id>/w=640,q=75,f=auto
 *
 * `f=auto`는 Accept 헤더 기반으로 AVIF/WebP를 협상한다(검증 완료).
 * Cloudflare 외 호스트(GitHub 아바타, /public 로컬 파일 등)는 그대로 통과시킨다.
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (!src.includes(CF_IMAGES_HOST)) return src;

  const base = src.replace(NAMED_VARIANT, '');
  return `${base}/w=${width},q=${quality ?? 75},f=auto`;
}
