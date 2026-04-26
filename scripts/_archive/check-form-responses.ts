import { prisma } from '../src/lib/db/prisma';

async function checkFormData() {
  console.log('🔍 Max Cooper Insight Session 폼 데이터 확인...\n');

  // 1. Form 정보
  const form = await prisma.form.findFirst({
    where: { slug: 'max-cooper-insight-session' },
    include: {
      fields: true,
      submissions: {
        include: {
          responses: true,
        },
        orderBy: {
          submittedAt: 'desc',
        },
      },
    },
  });

  if (!form) {
    console.log('❌ Form을 찾을 수 없습니다');
    return;
  }

  console.log('📋 Form 정보:');
  console.log(`  - ID: ${form.id}`);
  console.log(`  - 제목: ${form.title}`);
  console.log(`  - 마지막 수정: ${form.updatedAt}`);
  console.log(`  - 현재 필드 수: ${form.fields.length}`);
  console.log(`  - 제출 데이터 수: ${form.submissions.length}\n`);

  if (form.submissions.length > 0) {
    console.log('✅ 제출 데이터는 남아있습니다!\n');

    // 최신 제출 데이터 확인
    const latestSubmission = form.submissions[0];
    console.log('📊 최신 제출 데이터:');
    console.log(`  - 제출 시간: ${latestSubmission.submittedAt}`);
    console.log(`  - 응답 수: ${latestSubmission.responses.length}`);

    if (latestSubmission.responses.length > 0) {
      console.log('\n  응답 내용:');
      latestSubmission.responses.forEach((r, idx) => {
        console.log(
          `    ${idx + 1}. [${r.fieldType || 'unknown'}] ${r.fieldLabel || 'unknown'}: ${r.value.substring(0, 50)}${r.value.length > 50 ? '...' : ''}`
        );
        console.log(`       fieldId: ${r.fieldId || 'NULL ⚠️'}`);
      });
    }

    // fieldId가 NULL인 응답 확인
    const nullFieldIdCount = form.submissions.reduce(
      (sum, sub) => sum + sub.responses.filter((r) => !r.fieldId).length,
      0
    );

    if (nullFieldIdCount > 0) {
      console.log(
        `\n⚠️  fieldId가 NULL인 응답: ${nullFieldIdCount}개 (데이터는 보존됨)`
      );
    }
  } else {
    console.log('❌ 제출 데이터가 모두 삭제되었습니다!');
  }

  // 현재 필드 목록
  if (form.fields.length > 0) {
    console.log('\n📝 현재 필드 목록:');
    form.fields.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.type}] ${f.label}`);
    });
  }

  await prisma.$disconnect();
}

checkFormData().catch(console.error);
