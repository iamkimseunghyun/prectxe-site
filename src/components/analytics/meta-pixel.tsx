'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { trackMetaPageView } from '@/lib/analytics/meta-pixel';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  const pathname = usePathname();
  const isInitialLoad = useRef(true);

  // 인라인 스크립트가 최초 PageView를 발사하므로, 이후 클라이언트 네비게이션만 추적.
  // pathname은 값 사용이 아닌 "라우트 변경 트리거"로만 쓰이므로 의존성으로 유지.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname은 재발사 트리거 전용 의존성
  useEffect(() => {
    if (!PIXEL_ID) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    trackMetaPageView();
  }, [pathname]);

  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* Meta 추적용 1×1 비콘 — 콘텐츠 이미지가 아니므로 next/image 미적용 */}
        {/* biome-ignore lint/performance/noImgElement: Meta Pixel noscript 추적 비콘 */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
