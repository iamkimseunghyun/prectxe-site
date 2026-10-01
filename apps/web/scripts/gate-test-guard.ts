// 테스트 스크립트는 테스트 데이터를 만들고 지운다. 허용한 dev DB 호스트에서만
// 실행한다 — prod 호스트를 막는 방식은 엔드포인트가 바뀌면 그대로 뚫린다.
// Neon dev(program-model-v1) 엔드포인트. 호스트 식별자일 뿐 자격 증명은 아니다.
const ALLOWED_HOST_MARKERS = ['ep-rapid-art'];

export function assertNotProduction(): void {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error('DATABASE_URL이 없습니다. apps/web에서 실행하세요.');
  const host = new URL(url).hostname;
  // 다른 개발 DB를 쓸 때는 GATE_TEST_DB_HOST로 그 호스트를 명시한다
  const extra = process.env.GATE_TEST_DB_HOST;
  const allowed =
    ALLOWED_HOST_MARKERS.some((marker) => host.includes(marker)) ||
    (!!extra && host === extra);
  if (!allowed)
    throw new Error(
      `허용된 개발 DB가 아닙니다(${host}). 다른 개발 DB라면 GATE_TEST_DB_HOST=${host}로 실행하세요.`
    );
  console.log(`  DB: ${host}`);
}
