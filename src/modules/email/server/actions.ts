'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { filterValidEmails, sendEmail } from '@/lib/email/send';

/**
 * Form 응답자의 이메일 주소 추출
 */
export async function getFormRespondentsEmails(formId: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: true,
        submissions: {
          include: {
            responses: true,
          },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    // 이메일 필드 찾기
    const emailFields = form.fields.filter((f) => f.type === 'email');

    if (emailFields.length === 0) {
      return {
        success: false,
        error: '이 폼에는 이메일 필드가 없습니다',
      };
    }

    // 모든 응답에서 이메일 추출
    const emails: string[] = [];
    for (const submission of form.submissions) {
      for (const response of submission.responses) {
        // 이메일 필드의 응답만 추출
        if (
          emailFields.some((f) => f.id === response.fieldId) &&
          response.value
        ) {
          emails.push(response.value);
        }
      }
    }

    // 유효한 이메일만 필터링
    const validEmails = filterValidEmails(emails);

    return {
      success: true,
      data: {
        formTitle: form.title,
        totalSubmissions: form.submissions.length,
        emailFieldCount: emailFields.length,
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
  userId: string;
}) {
  try {
    const { title, subject, body, template, emails, formId, userId } = params;

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
 * 이메일 캠페인 목록 조회
 */
export async function listEmailCampaigns(userId: string, isAdmin = false) {
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        form: {
          select: {
            title: true,
            slug: true,
          },
        },
        recipients: {
          select: {
            id: true,
            email: true,
            success: true,
          },
        },
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
export async function getEmailCampaign(
  campaignId: string,
  userId: string,
  isAdmin = false
) {
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

    // 권한 확인
    if (!isAdmin && campaign.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
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
export async function getFormsWithEmailFields(userId: string, isAdmin = false) {
  try {
    const forms = await prisma.form.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        fields: {
          where: {
            type: 'email',
          },
        },
        submissions: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 이메일 필드가 있는 폼만 필터링
    const formsWithEmail = forms.filter((f) => f.fields.length > 0);

    return {
      success: true,
      data: formsWithEmail.map((f) => ({
        id: f.id,
        title: f.title,
        slug: f.slug,
        emailFieldCount: f.fields.length,
        submissionCount: f.submissions.length,
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
