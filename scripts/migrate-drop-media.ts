/**
 * 기존 Drop 미디어(DropImage + Drop.videoUrl)를 통합 DropMedia로 이전.
 *
 * 안전:
 * - 기존 DropImage / Drop.videoUrl은 그대로 유지 (삭제는 별도 migration)
 * - 이미 DropMedia에 데이터가 있으면 스킵 (재실행 안전)
 *
 * 실행: bun run scripts/migrate-drop-media.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Drop 미디어 통합 마이그레이션 시작...\n');

  const drops = await prisma.drop.findMany({
    include: {
      images: { orderBy: { order: 'asc' } },
      media: true,
    },
  });

  console.log(`📦 대상 Drop: ${drops.length}개\n`);

  let imagesCreated = 0;
  let videosCreated = 0;
  let skipped = 0;

  for (const drop of drops) {
    // 이미 마이그레이션된 Drop은 스킵
    if (drop.media.length > 0) {
      console.log(`  ⏭  [${drop.slug}] 이미 DropMedia 있음 — 스킵`);
      skipped += 1;
      continue;
    }

    const toCreate: Array<{
      dropId: string;
      type: 'image' | 'video';
      url: string;
      alt: string;
      order: number;
    }> = [];

    // DropImage → DropMedia{type:'image'}
    for (const img of drop.images) {
      toCreate.push({
        dropId: drop.id,
        type: 'image',
        url: img.imageUrl,
        alt: img.alt,
        order: img.order,
      });
    }

    // Drop.videoUrl → DropMedia{type:'video'} (이미지 다음 순서)
    if (drop.videoUrl) {
      const maxOrder = drop.images.reduce((m, i) => Math.max(m, i.order), -1);
      toCreate.push({
        dropId: drop.id,
        type: 'video',
        url: drop.videoUrl,
        alt: '',
        order: maxOrder + 1,
      });
    }

    if (toCreate.length === 0) {
      console.log(`  ⬜  [${drop.slug}] 미디어 없음 — 스킵`);
      continue;
    }

    await prisma.dropMedia.createMany({ data: toCreate });

    const img = toCreate.filter((m) => m.type === 'image').length;
    const vid = toCreate.filter((m) => m.type === 'video').length;
    imagesCreated += img;
    videosCreated += vid;
    console.log(`  ✅ [${drop.slug}] 이미지 ${img} + 영상 ${vid}`);
  }

  console.log(`\n📊 결과:`);
  console.log(`  이미지 이전: ${imagesCreated}`);
  console.log(`  영상 이전: ${videosCreated}`);
  console.log(`  이미 이전됨(스킵): ${skipped}`);
  console.log(`\n✅ 완료`);
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
