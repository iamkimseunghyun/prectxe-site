'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import { prisma } from '@/lib/db/prisma';
import {
  createResendClient,
  getSenderEmail,
  RESEND_UNSUBSCRIBE_PLACEHOLDER,
} from '@/lib/email/resend';
import { getOrCreateNewsletterSegmentId } from '@/lib/email/segments';
import { filterValidEmails, sendEmail } from '@/lib/email/send';
import Newsletter from '@/lib/email/templates/newsletter';
import { checkRateLimit, isRateLimited } from '@/lib/rate-limit/memory';
import {
  emailCampaignSchema,
  newsletterBroadcastSchema,
} from '@/lib/schemas/email';

/**
 * 같은 IP에서 1시간에 허용할 구독 시도 횟수.
 * 공연장 WiFi·회사망 등 NAT 뒤에서 여러 명이 구독할 수 있어 여유를 뒀다.
 * 단일 발신지의 버스트를 시간당 10회로 묶는 것만으로 API 증폭은 충분히 막힌다.
 */
const SUBSCRIBE_IP_LIMIT = 10;
const SUBSCRIBE_IP_WINDOW_MS = 60 * 60 * 1000;
/** 같은 주소의 재구독은 24시간에 1회만 Resend까지 보낸다 */
const SUBSCRIBE_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 클라이언트 IP.
 *
 * Vercel은 `x-forwarded-for`를 **덮어쓰고 외부에서 들어온 값을 전달하지 않는다**
 * (Enterprise trusted proxy 예외) — 즉 이 배포 환경에서 이 헤더는 스푸핑되지
 * 않는다. 반면 `x-real-ip`는 Vercel이 관리하지 않아 클라이언트가 임의 값을
 * 넣을 수 있으므로 폴백으로도 쓰지 않는다(넣으면 한도를 무한정 우회당한다).
 *
 * 헤더가 없으면 'unknown' 공용 버킷으로 묶어 한도를 함께 쓰게 한다 —
 * 제한 없이 통과시키는 것보다 안전한 실패 방향이다.
 *
 * @see https://vercel.com/docs/headers/request-headers
 */
async function getClientIp(): Promise<string> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

/**
 * 뉴스레터 구독 — Resend contacts 등록 + 뉴스레터 segment에 포함.
 * 이미 구독 중이어도 segment 추가는 항상 시도(idempotent) — 과거에 segment 없이
 * 등록된 구독자도 이 흐름으로 정상 포함시킴.
 *
 * 2026년부터 Resend Broadcasts는 segment_id 필수. 본 액션이 뉴스레터 세그먼트를
 * 자동 탐지/생성해서 신규·기존 구독자를 모두 세그먼트에 편입시킴.
 *
 * ⚠️ 인증 없는 공개 액션이다. 호출 1회당 Resend API를 최대 3회 호출하고,
 * Resend rate limit은 **팀당 10 req/s로 모든 API 키가 공유**한다. 즉 여기를
 * 막지 않으면 구독 폼 폭주가 주문 확인·입금 안내 메일까지 함께 끌어내린다.
 */
export async function subscribeNewsletter(email: string) {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return {
      success: false as const,
      error: '올바른 이메일 주소를 입력해주세요.',
    };
  }

  const ip = await getClientIp();
  if (
    !checkRateLimit(
      `subscribe:ip:${ip}`,
      SUBSCRIBE_IP_LIMIT,
      SUBSCRIBE_IP_WINDOW_MS
    )
  ) {
    return {
      success: false as const,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  // 같은 주소를 반복 제출하면 Resend를 부를 필요가 없다.
  // 성공과 구분되는 응답을 주면 "이 주소가 이미 구독자인가"를 외부에서 조회할 수
  // 있는 열거 오라클이 되므로, 정상 구독과 똑같은 응답을 돌려준다.
  //
  // 여기서는 확인만 하고 기록하지 않는다 — 구독이 실제로 성사된 뒤에 기록한다.
  // 먼저 기록해 버리면 Resend 실패로 에러를 받은 사용자가 재시도했을 때
  // 실제 구독 없이 성공 응답만 받는다(조용한 구독 유실).
  const emailKey = `subscribe:email:${normalized}`;
  if (isRateLimited(emailKey, 1, SUBSCRIBE_EMAIL_WINDOW_MS)) {
    return { success: true as const };
  }

  try {
    const resend = createResendClient();
    const segmentId = await getOrCreateNewsletterSegmentId();

    const { error } = await resend.contacts.create({
      email: normalized,
      unsubscribed: false,
    });

    if (error && !error.message?.toLowerCase().includes('already')) {
      console.error('[newsletter] resend create error', error);
      return {
        success: false as const,
        error: '구독 처리 중 오류가 발생했습니다.',
      };
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

    // 구독이 성사된 시점에만 24시간 예산을 소모한다.
    checkRateLimit(emailKey, 1, SUBSCRIBE_EMAIL_WINDOW_MS);
    return { success: true as const };
  } catch (err) {
    console.error('[newsletter] unexpected error', err);
    return {
      success: false as const,
      error: '구독 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 폼 응답에서 유효한 수신자 주소를 뽑는다.
 *
 * **export하지 않는다** — 'use server' 파일의 export는 곧 RPC 엔드포인트이고,
 * 이 함수는 응답자 PII 전체를 반환한다. 발송 액션이 서버 안에서만 호출한다.
 */
async function resolveFormRecipients(formId: string): Promise<
  | {
      success: true;
      formTitle: string;
      totalSubmissions: number;
      emails: string[];
    }
  | { success: false; error: string }
> {
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
    return { success: false, error: '이 폼에는 이메일 필드가 없습니다' };
  }

  // 이메일 필드의 응답만 DB에서 직접 조회 (전체 submission·response 적재 방지)
  const [responses, totalSubmissions] = await Promise.all([
    prisma.formResponse.findMany({
      where: { fieldId: { in: emailFieldIds }, submission: { formId } },
      select: { value: true },
    }),
    prisma.formSubmission.count({ where: { formId } }),
  ]);

  return {
    success: true,
    formTitle: form.title,
    totalSubmissions,
    emails: filterValidEmails(responses.map((r) => r.value)),
  };
}

/**
 * Form 응답자 수 미리보기.
 *
 * **주소 목록은 반환하지 않는다** — 발송에 필요한 주소는
 * `createAndSendEmailCampaign`이 서버 안에서 formId로 직접 조회한다.
 * 예전에는 이 액션이 전체 주소를 브라우저로 내려보내고 클라이언트가 그대로
 * 되돌려 보냈다(PII 왕복 + 수신자를 클라이언트가 결정).
 */
export async function getFormRespondentsSummary(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const resolved = await resolveFormRecipients(formId);
    if (!resolved.success) return resolved;

    return {
      success: true,
      data: {
        formTitle: resolved.formTitle,
        totalSubmissions: resolved.totalSubmissions,
        validEmailCount: resolved.emails.length,
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
 * 이메일 캠페인 생성 및 발송.
 *
 * 템플릿은 `form-notification` 고정이다. 뉴스레터 템플릿은 수신 거부 링크가
 * Broadcasts 전용 플레이스홀더에 의존하는데 이 경로(`emails.send`)에서는
 * 치환되지 않아 죽은 링크가 발송된다. 구독자 대상 뉴스레터는
 * `createAndSendNewsletterBroadcast`를 쓸 것.
 */
export async function createAndSendEmailCampaign(input: unknown) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };

  const parsed = parseInput(emailCampaignSchema, input);
  if (!parsed.success) return parsed;

  const params = parsed.data;
  const template = 'form-notification' as const;

  try {
    // 수신자 결정 — form 출처면 서버가 formId로 직접 조회한다.
    // 클라이언트가 보낸 주소 목록을 그대로 쓰면 수신자를 클라이언트가 정하게 되고,
    // 응답자 PII가 브라우저를 한 번 왕복한다.
    let validEmails: string[];
    let formId: string | undefined;

    if (params.source === 'form') {
      const resolved = await resolveFormRecipients(params.formId);
      if (!resolved.success) return resolved;
      formId = params.formId;
      validEmails = resolved.emails;
    } else {
      validEmails = filterValidEmails(params.emails);
    }

    if (validEmails.length === 0) {
      return { success: false, error: '유효한 이메일이 없습니다' };
    }

    // 이메일 캠페인 생성
    const campaign = await prisma.emailCampaign.create({
      data: {
        title: params.title,
        subject: params.subject,
        body: params.body,
        template,
        formId,
        userId: auth.userId,
        status: 'sending',
      },
    });

    // 이메일 발송.
    // campaign.id를 idempotency key로 넘겨, 타임아웃 후 재실행해도 Resend가
    // 이미 처리한 청크를 중복 발송하지 않게 한다.
    const result = await sendEmail({
      to: validEmails,
      subject: params.subject,
      template,
      data: { formTitle: params.title, message: params.body },
      idempotencyKey: campaign.id,
    });

    // 각 수신자 결과 저장 — createMany 한 번.
    // 예전에는 Promise.all로 수신자 수만큼 INSERT를 동시에 던져
    // 500명 발송 시 커넥션 풀을 고갈시켰다.
    const now = new Date();
    await prisma.emailRecipient.createMany({
      data: result.results.map((r) => ({
        campaignId: campaign.id,
        email: r.to,
        success: r.success,
        messageId: r.messageId,
        error: r.error,
        sentAt: r.success ? now : null,
      })),
    });

    // 캠페인 상태 업데이트.
    // EmailStatus에 partial이 없으므로 "한 건이라도 나갔으면 sent"로 두고,
    // 부분 실패는 failedCount(목록에서 빨간 배지)로 드러낸다.
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        status: result.sentCount > 0 ? 'sent' : 'failed',
        sentAt: now,
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
export async function createAndSendNewsletterBroadcast(input: unknown) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false as const, error: auth.error };
  }

  const parsed = parseInput(newsletterBroadcastSchema, input);
  if (!parsed.success) return { success: false as const, error: parsed.error };

  const { title, subject, body } = parsed.data;

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
      // 수신 거부 링크는 Broadcasts에서만 수신자별 URL로 치환된다.
      react: Newsletter({
        title,
        message: body,
        unsubscribeUrl: RESEND_UNSUBSCRIBE_PLACEHOLDER,
      }),
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
