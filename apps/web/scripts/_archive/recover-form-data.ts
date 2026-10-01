/**
 * Form 데이터 복구 스크립트
 *
 * 사용법:
 * 1. Neon에서 복구 브랜치 생성 (데이터 삭제 이전 시점)
 * 2. 환경변수 설정:
 *    export RECOVERY_DATABASE_URL="postgresql://...recovery-branch..."
 * 3. 스크립트 실행:
 *    bun run scripts/recover-form-data.ts
 */

import { PrismaClient } from '@prisma/client';

const FORM_SLUG = '2026-max-cooper-insight-session';

async function recoverFormData() {
  console.log('🚑 Form 데이터 복구 시작...\n');

  // 복구 브랜치 DB 연결
  const recoveryDbUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryDbUrl) {
    console.error('❌ RECOVERY_DATABASE_URL 환경변수가 설정되지 않았습니다');
    console.log('\n사용법:');
    console.log(
      'export RECOVERY_DATABASE_URL="postgresql://...recovery-branch..."'
    );
    console.log('bun run scripts/recover-form-data.ts');
    process.exit(1);
  }

  const recoveryDb = new PrismaClient({
    datasources: {
      db: {
        url: recoveryDbUrl,
      },
    },
  });

  // 메인 DB 연결 (현재 DATABASE_URL)
  const mainDb = new PrismaClient();

  try {
    // 1. 복구 브랜치에서 Form 찾기
    console.log(`🔍 복구 브랜치에서 "${FORM_SLUG}" Form 검색...`);
    const recoveryForm = await recoveryDb.form.findFirst({
      where: { slug: FORM_SLUG },
      include: {
        submissions: {
          include: {
            responses: true,
          },
        },
      },
    });

    if (!recoveryForm) {
      console.error(`❌ 복구 브랜치에서 Form을 찾을 수 없습니다`);
      process.exit(1);
    }

    console.log(`✅ 복구 브랜치에서 Form 발견!`);
    console.log(`   - 제출 데이터: ${recoveryForm.submissions.length}개\n`);

    if (recoveryForm.submissions.length === 0) {
      console.log('⚠️  복구할 제출 데이터가 없습니다');
      process.exit(0);
    }

    // 2. 메인 DB에서 현재 Form 찾기
    console.log(`🔍 메인 DB에서 "${FORM_SLUG}" Form 검색...`);
    const mainForm = await mainDb.form.findFirst({
      where: { slug: FORM_SLUG },
      include: {
        submissions: true,
      },
    });

    if (!mainForm) {
      console.error(`❌ 메인 DB에서 Form을 찾을 수 없습니다`);
      process.exit(1);
    }

    console.log(`✅ 메인 DB에서 Form 발견!`);
    console.log(`   - 현재 제출 데이터: ${mainForm.submissions.length}개\n`);

    // 3. 복구할 데이터 필터링 (중복 제거)
    const existingSubmissionIds = new Set(
      mainForm.submissions.map((s) => s.id)
    );

    const submissionsToRecover = recoveryForm.submissions.filter(
      (s) => !existingSubmissionIds.has(s.id)
    );

    console.log(`📊 복구 통계:`);
    console.log(
      `   - 복구 브랜치 제출 데이터: ${recoveryForm.submissions.length}개`
    );
    console.log(`   - 메인 DB 제출 데이터: ${mainForm.submissions.length}개`);
    console.log(`   - 복구할 데이터: ${submissionsToRecover.length}개\n`);

    if (submissionsToRecover.length === 0) {
      console.log('✅ 모든 데이터가 이미 존재합니다. 복구 불필요!');
      process.exit(0);
    }

    // 4. 확인 메시지
    console.log('⚠️  다음 작업을 수행합니다:');
    console.log(
      `   - ${submissionsToRecover.length}개의 제출 데이터를 메인 DB에 복구`
    );
    console.log(
      `   - 총 ${submissionsToRecover.reduce((sum, s) => sum + s.responses.length, 0)}개의 응답 데이터 포함\n`
    );

    // 자동 진행 (확인 없이)
    console.log('🚀 복구 시작...\n');

    // 5. 데이터 복구
    let recoveredCount = 0;
    for (const submission of submissionsToRecover) {
      try {
        // FormSubmission 생성
        await mainDb.formSubmission.create({
          data: {
            id: submission.id,
            formId: mainForm.id,
            submittedAt: submission.submittedAt,
            ipAddress: submission.ipAddress,
            userAgent: submission.userAgent,
            responses: {
              create: submission.responses.map((r) => ({
                id: r.id,
                fieldId: r.fieldId,
                fieldLabel: r.fieldLabel,
                fieldType: r.fieldType,
                value: r.value,
                createdAt: r.createdAt,
              })),
            },
          },
        });

        recoveredCount++;
        console.log(
          `   ✅ ${recoveredCount}/${submissionsToRecover.length} 복구 완료`
        );
      } catch (error) {
        console.error(
          `   ❌ 제출 데이터 ${submission.id} 복구 실패:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(`\n🎉 복구 완료!`);
    console.log(`   - 복구된 제출 데이터: ${recoveredCount}개`);
    console.log(
      `   - 최종 제출 데이터 수: ${mainForm.submissions.length + recoveredCount}개`
    );

    // 6. 최종 확인
    const finalForm = await mainDb.form.findFirst({
      where: { slug: FORM_SLUG },
      include: {
        submissions: true,
      },
    });

    console.log(`\n📊 최종 상태:`);
    console.log(`   - 제출 데이터: ${finalForm?.submissions.length || 0}개`);
  } catch (error) {
    console.error('\n❌ 복구 중 오류 발생:', error);
    throw error;
  } finally {
    await recoveryDb.$disconnect();
    await mainDb.$disconnect();
  }
}

recoverFormData().catch(console.error);
