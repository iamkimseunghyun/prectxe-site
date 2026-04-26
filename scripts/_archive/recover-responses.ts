/**
 * FormResponse 데이터 복구 스크립트
 *
 * 응답이 없는 제출(FormSubmission)의 응답 데이터를 복구합니다.
 */

import { PrismaClient } from '@prisma/client';

const FORM_ID = 'cmkqjf4nh0001l804msbitamj'; // 2026-max-cooper-insight-session

async function recoverResponses() {
  console.log('🚑 FormResponse 데이터 복구 시작...\n');

  // 복구 브랜치 DB 연결
  const recoveryDbUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryDbUrl) {
    console.error('❌ RECOVERY_DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  // 메인 DB URL (Neon Console main branch)
  const mainDbUrl = process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!mainDbUrl) {
    console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  const recoveryDb = new PrismaClient({
    datasources: {
      db: {
        url: recoveryDbUrl,
      },
    },
  });

  const mainDb = new PrismaClient({
    datasources: {
      db: {
        url: mainDbUrl,
      },
    },
  });

  try {
    // 1. 메인 DB에서 응답이 없는 제출 찾기
    console.log('🔍 메인 DB에서 응답이 없는 제출 검색...');
    const submissionsWithoutResponses = await mainDb.$queryRaw<
      Array<{ id: string; submittedAt: Date }>
    >`
      SELECT
        fs.id,
        fs."submittedAt"
      FROM "FormSubmission" fs
      LEFT JOIN "FormResponse" fr ON fs.id = fr."submissionId"
      WHERE fs."formId" = ${FORM_ID}
      GROUP BY fs.id, fs."submittedAt"
      HAVING COUNT(fr.id) = 0
      ORDER BY fs."submittedAt" DESC
    `;

    console.log(
      `   - 응답 없는 제출: ${submissionsWithoutResponses.length}개\n`
    );

    if (submissionsWithoutResponses.length === 0) {
      console.log('✅ 모든 제출에 응답이 있습니다!');
      process.exit(0);
    }

    // 2. 복구 브랜치에서 해당 제출의 응답 데이터 찾기
    console.log('🔍 복구 브랜치에서 응답 데이터 검색...');
    const submissionIds = submissionsWithoutResponses.map((s) => s.id);

    const responsesFromRecovery = await recoveryDb.formResponse.findMany({
      where: {
        submissionId: {
          in: submissionIds,
        },
      },
    });

    console.log(`   - 복구 가능한 응답: ${responsesFromRecovery.length}개\n`);

    if (responsesFromRecovery.length === 0) {
      console.log('⚠️  복구 브랜치에도 응답 데이터가 없습니다');
      process.exit(0);
    }

    // 3. 응답 데이터 복구
    console.log('🚀 응답 데이터 복구 시작...\n');

    let recoveredCount = 0;
    const errors: string[] = [];

    for (const response of responsesFromRecovery) {
      try {
        await mainDb.formResponse.create({
          data: {
            id: response.id,
            submissionId: response.submissionId,
            fieldId: null, // Set to NULL because old fieldId doesn't exist
            fieldLabel: response.fieldLabel,
            fieldType: response.fieldType,
            value: response.value,
            createdAt: response.createdAt,
          },
        });

        recoveredCount++;
        if (recoveredCount % 10 === 0) {
          console.log(
            `   ✅ ${recoveredCount}/${responsesFromRecovery.length} 복구 완료`
          );
        }
      } catch (error) {
        const errorMsg = `응답 ${response.id} 복구 실패: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }

    console.log(`\n🎉 복구 완료!`);
    console.log(`   - 복구된 응답: ${recoveredCount}개`);
    console.log(`   - 실패: ${errors.length}개\n`);

    if (errors.length > 0) {
      console.log('❌ 실패한 응답:');
      errors.forEach((err) => console.log(`   - ${err}`));
    }

    // 4. 최종 검증
    console.log('\n📊 최종 검증 중...');
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
        `\n⚠️  ${remainingWithoutResponses}개의 제출은 복구 브랜치에도 응답이 없습니다`
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

recoverResponses().catch(console.error);
