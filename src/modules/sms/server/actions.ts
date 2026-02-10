'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import {
  filterValidPhoneNumbers,
  normalizePhoneNumber,
  sendSMS,
} from '@/lib/sms/provider';

/**
 * Form 응답자의 전화번호 추출
 */
export async function getFormRespondentsPhones(formId: string) {
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

    // 전화번호 필드 찾기
    const phoneFields = form.fields.filter((f) => f.type === 'phone');

    if (phoneFields.length === 0) {
      return {
        success: false,
        error: '이 폼에는 전화번호 필드가 없습니다',
      };
    }

    // 모든 응답에서 전화번호 추출
    const phones: string[] = [];
    for (const submission of form.submissions) {
      for (const response of submission.responses) {
        // 전화번호 필드의 응답만 추출
        if (
          phoneFields.some((f) => f.id === response.fieldId) &&
          response.value
        ) {
          phones.push(response.value);
        }
      }
    }

    // 유효한 전화번호만 필터링 및 정규화
    const validPhones = filterValidPhoneNumbers(phones);

    return {
      success: true,
      data: {
        formTitle: form.title,
        totalSubmissions: form.submissions.length,
        phoneFieldCount: phoneFields.length,
        validPhoneCount: validPhones.length,
        phones: validPhones,
      },
    };
  } catch (error) {
    console.error('전화번호 추출 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '전화번호 추출에 실패했습니다',
    };
  }
}

/**
 * SMS 캠페인 생성 및 발송
 */
export async function createAndSendSMSCampaign(params: {
  title: string;
  message: string;
  phones: string[];
  formId?: string;
  userId: string;
}) {
  try {
    const { title, message, phones, formId, userId } = params;

    // 전화번호 검증 및 정규화
    const validPhones = filterValidPhoneNumbers(phones);

    if (validPhones.length === 0) {
      return { success: false, error: '유효한 전화번호가 없습니다' };
    }

    // SMS 캠페인 생성
    const campaign = await prisma.sMSCampaign.create({
      data: {
        title,
        message,
        formId,
        userId,
        status: 'sending',
      },
    });

    // SMS 발송
    const result = await sendSMS({
      to: validPhones,
      text: message,
    });

    // 각 수신자 결과 저장
    await Promise.all(
      result.results.map((r) =>
        prisma.sMSRecipient.create({
          data: {
            campaignId: campaign.id,
            phone: r.to,
            success: r.success,
            messageId: r.messageId,
            error: r.error,
            sentAt: r.success ? new Date() : null,
          },
        })
      )
    );

    // 캠페인 상태 업데이트
    await prisma.sMSCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date(),
      },
    });

    revalidatePath('/admin/sms');

    // 모든 발송이 실패한 경우 에러 반환
    if (result.sentCount === 0) {
      const firstError = result.results.find((r) => r.error);
      return {
        success: false,
        error: firstError?.error || 'SMS 발송에 실패했습니다',
      };
    }

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
    };
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS 발송에 실패했습니다',
    };
  }
}

/**
 * SMS 캠페인 목록 조회
 */
export async function listSMSCampaigns(userId: string, isAdmin = false) {
  try {
    const campaigns = await prisma.sMSCampaign.findMany({
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
            phone: true,
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
 * SMS 캠페인 상세 조회
 */
export async function getSMSCampaign(
  campaignId: string,
  userId: string,
  isAdmin = false
) {
  try {
    const campaign = await prisma.sMSCampaign.findUnique({
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
 * 모든 Form 목록 조회 (전화번호 필드가 있는 Form만)
 */
export async function getFormsWithPhoneFields(userId: string, isAdmin = false) {
  try {
    const forms = await prisma.form.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        fields: {
          where: {
            type: 'phone',
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

    // 전화번호 필드가 있는 폼만 필터링
    const formsWithPhone = forms.filter((f) => f.fields.length > 0);

    return {
      success: true,
      data: formsWithPhone.map((f) => ({
        id: f.id,
        title: f.title,
        slug: f.slug,
        phoneFieldCount: f.fields.length,
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
