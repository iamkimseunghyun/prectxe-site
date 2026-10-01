/**
 * OG 이미지(ImageResponse/Satori)용 Noto Sans KR Bold 폰트 로더.
 *
 * Google Fonts CSS API는 응답을 User-Agent에 맞춰 다르게 준다:
 * - 모던 브라우저 UA → unicode-range로 잘게 쪼갠 woff2 서브셋 124개. 첫 블록은
 *   CJK 호환/전각 기호 영역이라 일반 한글 음절(U+AC00–D7A3)이 없다 → 첫 url만
 *   집으면 한글이 전부 tofu로 깨진다.
 * - UA 없음 → 모든 글리프가 담긴 단일 truetype(.ttf) 전체 폰트 1개.
 *
 * 따라서 UA를 보내지 않고 전체 truetype 폰트를 받는다. (기존 정규식은
 * `format('woff2')`만 매칭해 UA 없는 응답의 truetype을 못 잡고 null →
 * Satori가 한글 폰트 부재로 throw, OG 라우트가 500 → 카톡 OG 흰 화면이었다.)
 * 네트워크 실패 시 null 반환(graceful).
 */
export async function loadNotoSansKrBold(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap'
    ).then((res) => res.text());

    const match = css.match(
      /src:\s*url\(([^)]+)\)\s*format\(['"]?truetype['"]?\)/
    );
    if (!match) return null;

    const fontUrl = match[1].replace(/['"]/g, '');
    return await fetch(fontUrl).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}
