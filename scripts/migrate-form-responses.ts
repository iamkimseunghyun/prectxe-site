import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateFormResponses() {
  console.log('🔄 기존 FormResponse 데이터 마이그레이션 시작...');

  try {
    // 기존 응답에 fieldLabel과 fieldType 채우기
    const result = await prisma.$executeRaw`
      UPDATE "FormResponse" fr
      SET
        "fieldLabel" = ff.label,
        "fieldType" = ff.type
      FROM "FormField" ff
      WHERE fr."fieldId" = ff.id
        AND fr."fieldLabel" IS NULL;
    `;

    console.log(`✅ ${result}개의 응답 데이터가 업데이트되었습니다.`);

    // 확인
    const count = await prisma.formResponse.count({
      where: {
        fieldLabel: null,
      },
    });

    if (count > 0) {
      console.log(`⚠️  경고: ${count}개의 응답에 여전히 fieldLabel이 없습니다.`);
    } else {
      console.log('✅ 모든 응답 데이터가 정상적으로 마이그레이션되었습니다.');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateFormResponses();
