/**
 * 복구 브랜치에서 3개 제출 확인
 */

import { PrismaClient } from '@prisma/client';

const TARGET_SUBMISSION_IDS = [
  'cmkxroasj000jju04sr1air0d', // 2026-01-28 17:32:04
  'cmkxrkl3f000aju04bfv589rp', // 2026-01-28 17:29:10
  'cmkxrjnjj0001ju04mfdyffuk', // 2026-01-28 17:28:27
];

async function checkThreeInRecovery() {
  console.log('🔍 복구 브랜치에서 3개 제출 확인...\n');

  const recoveryDbUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryDbUrl) {
    console.error('❌ RECOVERY_DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  const recoveryDb = new PrismaClient({
    datasources: { db: { url: recoveryDbUrl } },
  });

  try {
    // 제출 자체가 존재하는지 확인
    const submissions = await recoveryDb.formSubmission.findMany({
      where: {
        id: {
          in: TARGET_SUBMISSION_IDS,
        },
      },
      include: {
        responses: true,
      },
    });

    console.log(`📊 복구 브랜치에서 발견된 제출: ${submissions.length}개\n`);

    for (const submission of submissions) {
      console.log(`✅ 제출 ID: ${submission.id}`);
      console.log(`   - 제출 시간: ${submission.submittedAt}`);
      console.log(`   - 응답 수: ${submission.responses.length}개`);

      if (submission.responses.length > 0) {
        console.log('   - 응답 데이터:');
        submission.responses.forEach((r) => {
          console.log(
            `     * ${r.fieldLabel}: ${r.value.substring(0, 30)}...`
          );
        });
      }
      console.log();
    }

    if (submissions.length === 0) {
      console.log(
        '⚠️  이 3개 제출은 복구 브랜치 시점(1월 28일 오후 5:25)에 존재하지 않습니다.'
      );
      console.log(
        '제출 시간(17:28-17:32)이 복구 시점(17:25) 이후이므로 정상입니다.\n'
      );
      console.log(
        '💡 해결책: 1월 28일 오후 5:35 이후 시점의 복구 브랜치를 생성해야 합니다.'
      );
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await recoveryDb.$disconnect();
  }
}

checkThreeInRecovery().catch(console.error);
