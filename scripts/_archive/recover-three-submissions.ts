/**
 * 1월 28일 오후 5:28-5:32 제출 3개의 응답 데이터 복구
 */

import { PrismaClient } from '@prisma/client';

const FORM_ID = 'cmkqjf4nh0001l804msbitamj';

// 응답 없는 3개 제출 ID
const TARGET_SUBMISSION_IDS = [
  'cmkxroasj000jju04sr1air0d', // 2026-01-28 17:32:04
  'cmkxrkl3f000aju04bfv589rp', // 2026-01-28 17:29:10
  'cmkxrjnjj0001ju04mfdyffuk', // 2026-01-28 17:28:27
];

async function recoverThreeSubmissions() {
  console.log('🚑 3개 제출의 응답 데이터 복구 시작...\n');

  const recoveryDbUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryDbUrl) {
    console.error('❌ RECOVERY_DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  const mainDbUrl =
    'postgresql://neondb_owner:npg_I4OZ1ryKXRzn@ep-hidden-frog-a1xuqjat-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  const recoveryDb = new PrismaClient({
    datasources: { db: { url: recoveryDbUrl } },
  });

  const mainDb = new PrismaClient({
    datasources: { db: { url: mainDbUrl } },
  });

  try {
    // 1. 복구 브랜치에서 3개 제출의 응답 데이터 찾기
    console.log('🔍 복구 브랜치에서 응답 데이터 검색...');
    const responsesFromRecovery = await recoveryDb.formResponse.findMany({
      where: {
        submissionId: {
          in: TARGET_SUBMISSION_IDS,
        },
      },
    });

    console.log(`   - 발견된 응답: ${responsesFromRecovery.length}개\n`);

    if (responsesFromRecovery.length === 0) {
      console.log('⚠️  복구 브랜치에도 응답 데이터가 없습니다');
      process.exit(0);
    }

    // 제출별로 그룹핑
    const responsesBySubmission = new Map<string, number>();
    for (const response of responsesFromRecovery) {
      const count = responsesBySubmission.get(response.submissionId) || 0;
      responsesBySubmission.set(response.submissionId, count + 1);
    }

    console.log('📊 제출별 응답 수:');
    responsesBySubmission.forEach((count, submissionId) => {
      const shortId = submissionId.substring(0, 10);
      console.log(`   - ${shortId}...: ${count}개`);
    });
    console.log();

    // 2. 현재 폼 필드 가져오기 (fieldLabel 매칭용)
    const form = await mainDb.form.findUnique({
      where: { id: FORM_ID },
      include: { fields: true },
    });

    if (!form) {
      console.error('❌ 폼을 찾을 수 없습니다');
      process.exit(1);
    }

    // 필드 라벨 → ID 매핑
    const fieldLabelToId = new Map<string, string>();
    for (const field of form.fields) {
      fieldLabelToId.set(field.label.trim(), field.id);
    }

    // 3. 응답 데이터 복구
    console.log('🚀 응답 데이터 복구 시작...\n');

    let recoveredCount = 0;
    const errors: string[] = [];

    for (const response of responsesFromRecovery) {
      try {
        const normalizedLabel = response.fieldLabel?.trim() || '';
        const matchedFieldId = fieldLabelToId.get(normalizedLabel);

        await mainDb.formResponse.create({
          data: {
            id: response.id,
            submissionId: response.submissionId,
            fieldId: matchedFieldId || null,
            fieldLabel: response.fieldLabel,
            fieldType: response.fieldType,
            value: response.value,
            createdAt: response.createdAt,
          },
        });

        recoveredCount++;
        console.log(
          `   ✅ ${recoveredCount}/${responsesFromRecovery.length} 복구 완료`
        );
      } catch (error) {
        const errorMsg = `응답 ${response.id} 복구 실패: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }

    console.log(`\n🎉 복구 완료!`);
    console.log(`   - 복구된 응답: ${recoveredCount}개`);
    console.log(`   - 실패: ${errors.length}개\n`);

    // 4. 최종 검증
    console.log('📊 최종 검증...');
    const finalCheck = await mainDb.$queryRaw<
      Array<{ submissions_without_responses: bigint }>
    >`
      SELECT
        COUNT(CASE WHEN response_count = 0 THEN 1 END) as submissions_without_responses
      FROM (
        SELECT
          fs.id,
          COUNT(fr.id) as response_count
        FROM "FormSubmission" fs
        LEFT JOIN "FormResponse" fr ON fs.id = fr."submissionId"
        WHERE fs."formId" = ${FORM_ID}
        GROUP BY fs.id
      ) sub
    `;

    const remainingWithoutResponses = Number(
      finalCheck[0].submissions_without_responses
    );

    console.log(`   - 응답 없는 제출: ${remainingWithoutResponses}개`);

    if (remainingWithoutResponses === 0) {
      console.log('\n✅ 모든 제출에 응답이 복구되었습니다!');
    } else {
      console.log(
        `\n⚠️  ${remainingWithoutResponses}개 제출은 복구 브랜치에도 응답이 없습니다`
      );
    }
  } catch (error) {
    console.error('\n❌ 복구 중 오류 발생:', error);
    throw error;
  } finally {
    await recoveryDb.$disconnect();
    await mainDb.$disconnect();
  }
}

recoverThreeSubmissions().catch(console.error);
