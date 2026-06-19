'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { createResendClient, getSenderEmail } from '@/lib/email/resend';
import { getOrCreateNewsletterSegmentId } from '@/lib/email/segments';
import { filterValidEmails, sendEmail } from '@/lib/email/send';
import Newsletter from '@/lib/email/templates/newsletter';

/**
 * 뉴스레터 구독 — Resend contacts 등록 + 뉴스레터 segment에 포함.
 * 이미 구독 중이어도 segment 추가는 항상 시도(idempotent) — 과거에 segment 없이
 * 등록된 구독자도 이 흐름으로 정상 포함시킴.
 *
 * 2026년부터 Resend Broadcasts는 segment_id 필수. 본 액션이 뉴스레터 세그먼트를
 * 자동 탐지/생성해서 신규·기존 구독자를 모두 세그먼트에 편입시킴.
 */
export async function subscribeNewsletter(email: string) {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return {
      success: false as const,
      error: '올바른 이메일 주소를 입력해주세요.',
    };
  }

  try {
    const resend = createResendClient();
    const segmentId = await getOrCreateNewsletterSegmentId();

    const { error } = await resend.contacts.create({
      email: normalized,
      unsubscribed: false,
    });

    let alreadySubscribed = false;
    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        alreadySubscribed = true;
      } else {
        console.error('[newsletter] resend create error', error);
        return {
          success: false as const,
          error: '구독 처리 중 오류가 발생했습니다.',
        };
      }
    }

    // 세그먼트 편입 — 신규/기존 모두 실행(이미 속해 있으면 Resend가 무시)
    const addResult = await resend.contacts.segments.add({
      email: normalized,
      segmentId,
    });
    if (addResult.error) {
      // already-in-segment류 에러는 무시, 그 외는 로깅 후 실패 처리
      const msg = addResult.error.message?.toLowerCase() ?? '';
      if (!msg.includes('already')) {
        console.error('[newsletter] segment add error', addResult.error);
        return {
          success: false as const,
          error: '구독 처리 중 오류가 발생했습니다.',
        };
      }
    }

    return { success: true as const, alreadySubscribed };
  } catch (err) {
    console.error('[newsletter] unexpected error', err);
    return {
      success: false as const,
      error: '구독 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * Form 응답자의 이메일 주소 추출
 */
export async function getFormRespondentsEmails(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        title: true,
        fields: {
          where: { archived: false, type: 'email' },
          select: { id: true },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    const emailFieldIds = form.fields.map((f) => f.id);
    if (emailFieldIds.length === 0) {
      return {
        success: false,
        error: '이 폼에는 이메일 필드가 없습니다',
      };
    }

    // 이메일 필드의 응답만 DB에서 직접 조회 (전체 submission·response 적재 방지)
    const [responses, totalSubmissions] = await Promise.all([
      prisma.formResponse.findMany({
        where: { fieldId: { in: emailFieldIds }, submission: { formId } },
        select: { value: true },
      }),
      prisma.formSubmission.count({ where: { formId } }),
    ]);

    // 유효한 이메일만 필터링
    const validEmails = filterValidEmails(responses.map((r) => r.value));

    return {
      success: true,
      data: {
        formTitle: form.title,
        totalSubmissions,
        emailFieldCount: emailFieldIds.length,
        validEmailCount: validEmails.length,
        emails: validEmails,
      },
    };
  } catch (error) {
    console.error('이메일 추출 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '이메일 추출에 실패했습니다',
    };
  }
}

/**
 * 이메일 캠페인 생성 및 발송
 */
export async function createAndSendEmailCampaign(params: {
  title: string;
  subject: string;
  body: string;
  template: 'form-notification' | 'newsletter';
  emails: string[];
  formId?: string;
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const { title, subject, body, template, emails, formId } = params;
    const userId = auth.userId;

    // 이메일 검증
    const validEmails = filterValidEmails(emails);

    if (validEmails.length === 0) {
      return { success: false, error: '유효한 이메일이 없습니다' };
    }

    // 이메일 캠페인 생성
    const campaign = await prisma.emailCampaign.create({
      data: {
        title,
        subject,
        body,
        template,
        formId,
        userId,
        status: 'sending',
      },
    });

    // 템플릿 데이터 준비
    const templateData =
      template === 'form-notification'
        ? {
            formTitle: title,
            message: body,
          }
        : {
            title,
            message: body,
          };

    // 이메일 발송
    const result = await sendEmail({
      to: validEmails,
      subject,
      template,
      data: templateData,
    });

    // 각 수신자 결과 저장
    await Promise.all(
      result.results.map((r) =>
        prisma.emailRecipient.create({
          data: {
            campaignId: campaign.id,
            email: r.to,
            success: r.success,
            messageId: r.messageId,
            error: r.error,
            sentAt: r.success ? new Date() : null,
          },
        })
      )
    );

    // 캠페인 상태 업데이트
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date(),
      },
    });

    revalidatePath('/admin/email');

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
    };
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '이메일 발송에 실패했습니다',
    };
  }
}

/**
 * 뉴스레터 브로드캐스트 — Resend Segment에 속한 모든 구독자에게 즉시 발송.
 * - 수신자 목록은 Resend가 관리(본 DB에 EmailRecipient 저장 안 함)
 * - broadcastId는 EmailCampaign에 저장해 Resend 대시보드에서 추적 가능
 */
export async function createAndSendNewsletterBroadcast(params: {
  title: string;
  subject: string;
  body: string; // HTML (에디터 출력)
}) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false as const, error: auth.error };
  }

  const { title, subject, body } = params;

  if (!title.trim() || !subject.trim() || !body.trim()) {
    return {
      success: false as const,
      error: '제목·본문을 모두 입력해주세요.',
    };
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      title,
      subject,
      body,
      template: 'newsletter',
      userId: auth.userId,
      status: 'sending',
    },
  });

  try {
    const segmentId = await getOrCreateNewsletterSegmentId();
    const resend = createResendClient();
    const from = getSenderEmail();

    const result = await resend.broadcasts.create({
      segmentId,
      from,
      subject,
      react: Newsletter({ title, message: body }),
      name: title,
      send: true,
    });

    if (result.error || !result.data) {
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: 'failed' },
      });
      return {
        success: false as const,
        error: result.error?.message ?? '브로드캐스트 생성에 실패했습니다.',
      };
    }

    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        broadcastId: result.data.id,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    revalidatePath('/admin/email');

    return {
      success: true as const,
      data: { campaignId: campaign.id, broadcastId: result.data.id },
    };
  } catch (err) {
    console.error('[newsletter broadcast] error', err);
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'failed' },
    });
    return {
      success: false as const,
      error: err instanceof Error ? err.message : '브로드캐스트 발송 실패',
    };
  }
}

/**
 * 이메일 캠페인 목록 조회
 */
export async function listEmailCampaigns() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: {},
      include: {
        form: {
          select: {
            title: true,
            slug: true,
          },
        },
        // recipients는 목록에서 사용하지 않으므로 include하지 않음
        // (sentCount/failedCount는 캠페인 컬럼에 비정규화돼 있음)
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: campaigns };
  } catch (error) {
    console.error('캠페인 목록 조회 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '캠페인 목록 조회에 실패했습니다',
    };
  }
}

/**
 * 이메일 캠페인 상세 조회
 */
export async function getEmailCampaign(campaignId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        form: {
          select: {
            title: true,
            slug: true,
          },
        },
        recipients: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: '캠페인을 찾을 수 없습니다' };
    }

    return { success: true, data: campaign };
  } catch (error) {
    console.error('캠페인 조회 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '캠페인 조회에 실패했습니다',
    };
  }
}

/**
 * 모든 Form 목록 조회 (이메일 필드가 있는 Form만)
 */
export async function getFormsWithEmailFields() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    // 이메일 필드가 있는 폼만 DB에서 필터(where some) + 제출 수는 _count로
    // (전체 submission row 적재·JS 필터 제거)
    const forms = await prisma.form.findMany({
      where: {
        fields: { some: { type: 'email', archived: false } },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        fields: {
          where: { type: 'email', archived: false },
          select: { id: true },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: forms.map((f) => ({
        id: f.id,
        title: f.title,
        slug: f.slug,
        emailFieldCount: f.fields.length,
        submissionCount: f._count.submissions,
      })),
    };
  } catch (error) {
    console.error('폼 목록 조회 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '폼 목록 조회에 실패했습니다',
    };
  }
}
