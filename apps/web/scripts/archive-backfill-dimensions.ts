/**
 * 아카이브 이미지 크기 백필 — ProgramImage.width/height, Program.heroWidth/heroHeight.
 *
 * 마이그레이션(2026-10-10_archive_gallery.sql)이 컬럼만 추가하므로 기존 이미지는
 * 크기가 null이다(갤러리는 4:3 폴백). Cloudflare `public` variant를 받아 sharp로
 * 크기를 읽어 채운다. 값은 **비율 배치용**이라 variant가 줄어든 크기여도 상관없다.
 * Cloudflare는 EXIF 회전을 적용해서 내려주므로 sharp가 읽는 가로·세로가 화면과 같다.
 *
 * 기본은 읽기 전용(dry-run). 실제로 쓰려면 --apply. 이미 채워진 행은 건드리지 않아
 * 다시 실행해도 안전하다.
 *
 *   cd apps/web
 *   bun scripts/archive-backfill-dimensions.ts           # 대상 DB·건수·결과 미리보기
 *   bun scripts/archive-backfill-dimensions.ts --apply   # 실제 반영
 */
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { getImageUrl } from '../src/lib/utils/image-url';

const apply = process.argv.includes('--apply');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL이 없습니다.');

// 어느 DB에 쓰는지 눈으로 확인할 수 있게 호스트만 출력(비밀번호는 출력하지 않는다)
console.log(
  `대상 DB: ${new URL(connectionString).host}\n모드: ${
    apply ? 'APPLY (쓰기)' : 'DRY-RUN (읽기만)'
  }\n`
);

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const CONCURRENCY = 4;

async function readSize(imageUrl: string) {
  // 응답이 멈춘 이미지 하나가 전체를 붙잡지 않도록 30초 제한
  const res = await fetch(getImageUrl(imageUrl, 'public'), {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { width, height } = await sharp(
    Buffer.from(await res.arrayBuffer())
  ).metadata();
  if (!width || !height) throw new Error('크기를 읽지 못함');
  return { width, height };
}

/** 동시에 CONCURRENCY개씩만 처리 — Cloudflare에 한꺼번에 몰리지 않게 */
async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    })
  );
}

let ok = 0;
let failed = 0;

const images = await prisma.programImage.findMany({
  where: { OR: [{ width: null }, { height: null }] },
  select: { id: true, imageUrl: true, program: { select: { slug: true } } },
});
const heroes = await prisma.program.findMany({
  where: {
    heroUrl: { not: null },
    OR: [{ heroWidth: null }, { heroHeight: null }],
  },
  select: { id: true, slug: true, heroUrl: true },
});
console.log(
  `갤러리 이미지 ${images.length}장, 대표 이미지 ${heroes.length}장\n`
);

await runPool(images, async (img) => {
  try {
    const size = await readSize(img.imageUrl);
    if (apply) {
      await prisma.programImage.update({ where: { id: img.id }, data: size });
    }
    ok++;
    console.log(`  ${img.program.slug}  ${size.width}×${size.height}`);
  } catch (e) {
    failed++;
    console.error(`  [실패] ${img.program.slug} ${img.imageUrl}: ${e}`);
  }
});

await runPool(heroes, async (p) => {
  try {
    const size = await readSize(p.heroUrl as string);
    if (apply) {
      await prisma.program.update({
        where: { id: p.id },
        data: { heroWidth: size.width, heroHeight: size.height },
      });
    }
    ok++;
    console.log(`  [hero] ${p.slug}  ${size.width}×${size.height}`);
  } catch (e) {
    failed++;
    console.error(`  [실패] [hero] ${p.slug}: ${e}`);
  }
});

console.log(
  `\n${apply ? '반영' : '미리보기'} 완료 — 성공 ${ok}, 실패 ${failed}${
    apply ? '' : '  (쓰려면 --apply)'
  }`
);
await prisma.$disconnect();
