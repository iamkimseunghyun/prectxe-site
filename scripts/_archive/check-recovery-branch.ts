import { PrismaClient } from '@prisma/client';

async function checkRecoveryBranch() {
  console.log('🔍 복구 브랜치 데이터 확인...\n');

  const recoveryDbUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryDbUrl) {
    console.error('❌ RECOVERY_DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  const recoveryDb = new PrismaClient({
    datasources: {
      db: {
        url: recoveryDbUrl,
      },
    },
  });

  try {
    // Find all forms with 'max-cooper' in slug
    const forms = await recoveryDb.form.findMany({
      where: {
        slug: {
          contains: 'max-cooper',
        },
      },
      include: {
        submissions: {
          include: {
            responses: true,
          },
        },
      },
    });

    console.log(`📋 복구 브랜치에서 찾은 폼: ${forms.length}개\n`);

    for (const form of forms) {
      console.log(`✅ Form: ${form.slug}`);
      console.log(`   - ID: ${form.id}`);
      console.log(`   - 제목: ${form.title}`);
      console.log(`   - 제출 데이터: ${form.submissions.length}개`);
      const totalResponses = form.submissions.reduce(
        (sum, s) => sum + s.responses.length,
        0
      );
      console.log(`   - 응답 데이터: ${totalResponses}개\n`);
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await recoveryDb.$disconnect();
  }
}

checkRecoveryBranch().catch(console.error);
