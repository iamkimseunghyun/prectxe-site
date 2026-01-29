/**
 * 복구된 응답 데이터를 현재 필드로 마이그레이션
 *
 * fieldLabel을 기준으로 현재 FormField와 매칭하여 fieldId를 업데이트합니다.
 */

import { PrismaClient } from '@prisma/client';

const FORM_ID = 'cmkqjf4nh0001l804msbitamj'; // 2026-max-cooper-insight-session

async function migrateRecoveredResponses() {
  console.log('🔄 복구된 응답 데이터 마이그레이션 시작...\n');

  const mainDbUrl =
    process.env.MAIN_DATABASE_URL ||
    'postgresql://neondb_owner:npg_I4OZ1ryKXRzn@ep-hidden-frog-a1xuqjat-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  const db = new PrismaClient({
    datasources: {
      db: {
        url: mainDbUrl,
      },
    },
  });

  try {
    // 1. 현재 Form의 필드 가져오기
    console.log('🔍 현재 폼 필드 검색...');
    const form = await db.form.findUnique({
      where: { id: FORM_ID },
      include: {
        fields: true,
      },
    });

    if (!form) {
      console.error('❌ 폼을 찾을 수 없습니다');
      process.exit(1);
    }

    console.log(`   - 현재 필드 수: ${form.fields.length}개\n`);

    // 필드 라벨로 매핑 생성
    const fieldLabelToId = new Map<string, string>();
    for (const field of form.fields) {
      // 라벨 정규화 (공백 제거)
      const normalizedLabel = field.label.trim();
      fieldLabelToId.set(normalizedLabel, field.id);
      console.log(`   - "${normalizedLabel}" → ${field.id}`);
    }

    // 2. fieldId가 NULL인 응답 찾기 (복구된 데이터)
    console.log('\n🔍 복구된 응답 데이터 검색...');
    const recoveredResponses = await db.formResponse.findMany({
      where: {
        submission: {
          formId: FORM_ID,
        },
        fieldId: null,
      },
      include: {
        submission: true,
      },
    });

    console.log(`   - 복구된 응답: ${recoveredResponses.length}개\n`);

    if (recoveredResponses.length === 0) {
      console.log('✅ 마이그레이션할 데이터가 없습니다!');
      process.exit(0);
    }

    // 3. fieldLabel 기준으로 매칭하여 fieldId 업데이트
    console.log('🚀 응답 데이터 마이그레이션 시작...\n');

    let migratedCount = 0;
    let unmatchedCount = 0;
    const unmatchedLabels = new Set<string>();

    for (const response of recoveredResponses) {
      const normalizedLabel = response.fieldLabel?.trim() || '';
      const matchedFieldId = fieldLabelToId.get(normalizedLabel);

      if (matchedFieldId) {
        // 매칭되는 필드 발견 - fieldId 업데이트
        await db.formResponse.update({
          where: { id: response.id },
          data: {
            fieldId: matchedFieldId,
          },
        });

        migratedCount++;

        if (migratedCount % 10 === 0) {
          console.log(`   ✅ ${migratedCount}/${recoveredResponses.length} 마이그레이션 완료`);
        }
      } else {
        // 매칭되는 필드 없음 - fieldId는 NULL로 유지
        unmatchedCount++;
        unmatchedLabels.add(normalizedLabel);
      }
    }

    console.log(`\n🎉 마이그레이션 완료!`);
    console.log(`   - 성공: ${migratedCount}개`);
    console.log(`   - 매칭 안됨: ${unmatchedCount}개\n`);

    if (unmatchedLabels.size > 0) {
      console.log('⚠️  매칭되지 않은 필드 라벨:');
      unmatchedLabels.forEach((label) => {
        console.log(`   - "${label}"`);
      });
      console.log(
        '\n이 필드들은 폼에서 삭제되었거나 라벨이 변경되었습니다.'
      );
      console.log('fieldId는 NULL로 유지되며, CSV에서는 보이지 않습니다.\n');
    }

    // 4. 최종 검증
    console.log('📊 최종 검증...');
    const finalCheck = await db.formResponse.count({
      where: {
        submission: {
          formId: FORM_ID,
        },
        fieldId: null,
      },
    });

    console.log(`   - fieldId가 NULL인 응답: ${finalCheck}개`);

    if (finalCheck === 0) {
      console.log('\n✅ 모든 응답이 현재 필드에 매칭되었습니다!');
    }
  } catch (error) {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

migrateRecoveredResponses().catch(console.error);
