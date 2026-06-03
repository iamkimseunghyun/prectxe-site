/**
 * OG 이미지(ImageResponse/Satori)용 Noto Sans KR Bold woff2 로더.
 *
 * Google Fonts CSS API는 요청에 모던 브라우저 User-Agent가 없으면
 * woff2가 아닌 truetype URL을 반환한다. 기존 정규식이 `format('woff2')`만
 * 매칭했기 때문에 UA 없는 서버 fetch에서는 매칭 실패 → 폰트 null →
 * `fonts: []`로 ImageResponse 생성 시 한글 텍스트 렌더 폰트가 없어 500 발생.
 * (카카오톡 OG 미리보기가 흰색으로 깨지던 직접 원인)
 *
 * → 모던 브라우저 UA를 보내 woff2를 우선 확보하고, 정규식은 format에
 *   구애받지 않게 첫 url()을 잡는다. 네트워크 실패 시 null 반환(graceful).
 */
export async function loadNotoSansKrBold(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    ).then((res) => res.text());

    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(/);
    if (!match) return null;

    return await fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}
