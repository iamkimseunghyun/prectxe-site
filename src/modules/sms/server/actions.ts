'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
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
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        title: true,
        fields: {
          where: { archived: false, type: 'phone' },
          select: { id: true },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    const phoneFieldIds = form.fields.map((f) => f.id);
    if (phoneFieldIds.length === 0) {
      return {
        success: false,
        error: '이 폼에는 전화번호 필드가 없습니다',
      };
    }

    // 전화번호 필드의 응답만 DB에서 직접 조회 (전체 submission·response 적재 방지)
    const [responses, totalSubmissions] = await Promise.all([
      prisma.formResponse.findMany({
        where: { fieldId: { in: phoneFieldIds }, submission: { formId } },
        select: { value: true },
      }),
      prisma.formSubmission.count({ where: { formId } }),
    ]);

    // 유효한 전화번호만 필터링 및 정규화
    const validPhones = filterValidPhoneNumbers(responses.map((r) => r.value));

    return {
      success: true,
      data: {
        formTitle: form.title,
        totalSubmissions,
        phoneFieldCount: phoneFieldIds.length,
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
}) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };
    const userId = auth.userId;

    const { title, message, phones, formId } = params;

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
export async function listSMSCampaigns() {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    const campaigns = await prisma.sMSCampaign.findMany({
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
            name: true,
            value: true,
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
export async function getSMSCampaign(campaignId: string) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

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
export async function getFormsWithPhoneFields() {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    // 전화번호 필드가 있는 폼만 DB에서 필터(where some) + 제출 수는 _count로
    // (전체 submission row 적재·JS 필터 제거)
    const forms = await prisma.form.findMany({
      where: {
        fields: { some: { type: 'phone', archived: false } },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        fields: {
          where: { type: 'phone', archived: false },
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
        phoneFieldCount: f.fields.length,
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

/**
 * 개별 메시지 발송 (각자 다른 내용)
 */
export async function sendPersonalizedSMS(params: {
  recipients: Array<{
    phone: string;
    name?: string;
    value?: string;
  }>;
  template: string;
  title: string;
}) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };
    const userId = auth.userId;

    const { recipients, template, title } = params;

    if (recipients.length === 0) {
      return { success: false, error: '수신자가 없습니다' };
    }

    // SMS 캠페인 생성
    const campaign = await prisma.sMSCampaign.create({
      data: {
        title,
        message: template, // 템플릿 저장
        userId,
        status: 'sending',
      },
    });

    // 각 수신자에게 개별 메시지 생성 및 발송
    const results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // 메시지 변수 치환
        let message = template;

        // 이름 치환 (있으면 사용, 없으면 제거)
        if (recipient.name) {
          message = message.replace(/{name}/g, recipient.name);
        } else {
          // 이름이 없으면 "{name}님" 같은 패턴 제거
          message = message
            .replace(/{name}님,?\s*/g, '')
            .replace(/{name}/g, '');
        }

        // 개별 내용 치환 (있으면 사용, 없으면 제거)
        if (recipient.value) {
          message = message.replace(/{value}/g, recipient.value);
        } else {
          // 개별 내용이 없으면 {value} 제거
          message = message.replace(/{value}\s*/g, '').replace(/{value}/g, '');
        }

        // SMS 발송
        const result = await sendSMS({
          to: recipient.phone,
          text: message,
        });

        // 결과 처리
        const recipientResult = result.results[0];
        if (recipientResult?.success) {
          results.push({
            phone: recipient.phone,
            success: true,
            messageId: recipientResult.messageId,
          });
          sentCount++;
        } else {
          results.push({
            phone: recipient.phone,
            success: false,
            error: recipientResult?.error || 'Unknown error',
          });
          failedCount++;
        }
      } catch (error) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    // 각 수신자 결과 저장 (name, value 포함)
    await Promise.all(
      results.map((r, index) => {
        const recipient = recipients[index];
        return prisma.sMSRecipient.create({
          data: {
            campaignId: campaign.id,
            phone: r.phone,
            name: recipient?.name,
            value: recipient?.value,
            success: r.success,
            messageId: r.messageId,
            error: r.error,
            sentAt: r.success ? new Date() : null,
          },
        });
      })
    );

    // 캠페인 상태 업데이트
    await prisma.sMSCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount,
        failedCount,
        status: sentCount > 0 ? 'sent' : 'failed',
        sentAt: new Date(),
      },
    });

    revalidatePath('/admin/sms');

    // 모든 발송이 실패한 경우 에러 반환
    if (sentCount === 0) {
      const firstError = results.find((r) => r.error);
      return {
        success: false,
        error: firstError?.error || 'SMS 발송에 실패했습니다',
      };
    }

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        sentCount,
        failedCount,
        totalCount: recipients.length,
      },
    };
  } catch (error) {
    console.error('개별 SMS 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS 발송에 실패했습니다',
    };
  }
}
