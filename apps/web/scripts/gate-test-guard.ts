// 테스트 스크립트가 prod DB를 건드리지 못하게 막는다.
// Neon prod(main 브랜치) 엔드포인트. 호스트 식별자일 뿐 자격 증명은 아니다.
const PRODUCTION_HOST_MARKER = 'ep-hidden-frog';

export function assertNotProduction(): void {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error('DATABASE_URL이 없습니다. apps/web에서 실행하세요.');
  const host = new URL(url).hostname;
  if (host.includes(PRODUCTION_HOST_MARKER))
    throw new Error(`prod DB(${host})에서는 실행할 수 없습니다.`);
  console.log(`  DB: ${host}`);
}
