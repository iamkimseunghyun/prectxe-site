'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BackButton({
  className,
  fallbackHref = '/',
}: {
  className?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  // 히스토리가 없거나(공유 링크 등 직접 진입) 직전 페이지가 우리 서비스 밖(구글/SNS 등)이면
  // router.back()이 아무 반응이 없거나 서비스 밖으로 이탈시킴 — 두 경우 다 폴백 경로로 이동
  const handleClick = () => {
    const hasInternalReferrer = document.referrer.startsWith(
      window.location.origin
    );

    if (hasInternalReferrer && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        // top-20(80px) — 전역 고정 헤더(PublicHeader, z-50, 실측 높이 ~72px) 아래로 내려서 클릭 가로채임 방지.
        // mb-14 — sticky는 flow상 자기 "natural" 위치+높이만큼만 공간을 예약하고 실제로는 top offset으로 밀려 렌더링되므로,
        // margin을 늘려 예약 공간을 threshold(80px) + 버튼 높이(40px) 이상으로 키워야 다음 형제(커버 이미지)와 겹치지 않음.
        // md 이상에서만 보이므로(hidden md:flex) 반응형 분기 불필요.
        // bg/border/shadow 없는 완전 flat 스타일 — CopyUrlButton과 동일한 뉴트럴 컬러 전환 컨벤션(사이트 공개 페이지의 지배적 톤)을 따름.
        // w-fit을 빼서 icon size 기본값(w-10)을 쓰게 함 — w-fit이 있으면 원이 아니라 16px 폭 캡슐로 찌그러짐.
        'sticky left-0 top-20 z-30 mb-14 hidden text-neutral-400 transition-colors hover:bg-transparent hover:text-neutral-600 md:flex',
        className
      )}
      aria-label="뒤로 가기"
    >
      <ArrowLeft />
    </Button>
  );
}
