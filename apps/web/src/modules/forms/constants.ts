/**
 * 폼 커버 이미지 규격 — 안내 문구·업로드 박스·미리보기·공개 히어로가 모두 이 값을 쓴다.
 *
 * 히어로는 모든 화면에서 같은 비율(3:2)로 그려지므로 이 비율로 올린 이미지는
 * 어떤 기기에서도 잘리지 않는다. 비율을 바꾸면 `aspectClass`와 `RECOMMENDED_*`를
 * 함께 바꾸고, 기존 커버 이미지는 새 비율로 다시 올려야 한다.
 */
export const FORM_COVER = {
  /** Tailwind는 클래스를 문자열 그대로 스캔하므로 조합하지 말고 리터럴로 둔다. */
  aspectClass: 'aspect-3/2',
  /** 폼 본문(`max-w-3xl`)과 같은 폭 — 데스크톱에서 히어로가 화면 끝까지 늘어나지 않게 한다. */
  maxWidthClass: 'max-w-3xl',
  recommendedWidth: 1800,
  recommendedHeight: 1200,
  ratioLabel: '3:2',
} as const;
