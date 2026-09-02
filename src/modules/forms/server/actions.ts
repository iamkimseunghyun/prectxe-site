'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { getClientIp } from '@/lib/rate-limit/client-ip';
import { checkRateLimit } from '@/lib/rate-limit/memory';
import type { FormInput } from '@/lib/schemas/form';
import { createFormResponseSchema, formSchema } from '@/lib/schemas/form';

/**
 * 같은 IP에서 1시간에 허용할 폼 제출 횟수.
 *
 * 넉넉하게 잡았다. 공연장에서 단체로 RSVP를 넣는 게 이 폼들의 실제 사용
 * 패턴이라, 한 IP(장소 WiFi) 뒤에 수십 명이 동시에 있을 수 있다. 오탐의
 * 대가는 "현장에 온 사람이 신청을 못 한다"이고 재시도도 기대하기 어려운
 * 반면, 통과의 대가는 어드민이 지우면 되는 쓰레기 행 몇 개다.
 *
 * 이 한도의 목적은 분산 공격 차단이 아니라(인스턴스 로컬이라 애초에 불가)
 * 단일 발신지가 스크립트로 수천 건을 밀어넣는 것을 막는 것이다.
 */
const SUBMIT_IP_LIMIT = 50;
const SUBMIT_IP_WINDOW_MS = 60 * 60 * 1000;

/**
 * 업로드 URL 발급 한도.
 *
 * 제출보다 낮게 잡았다 — 여기서 발급되는 건 우리 Cloudflare 계정에 쓰는
 * 권한이라 남용이 곧 과금이다. 파일 필드를 쓰는 폼이 드물고 있어도 1개
 * 수준이라, 재시도를 감안해도 이 정도면 정상 사용을 막지 않는다.
 */
const UPLOAD_URL_IP_LIMIT = 40;

/**
 * slug 유니크 제약 위반인지. Prisma 에러 원문을 사용자에게 노출하지 않으려고
 * 코드만 보고 우리 문구로 바꾼다.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

// Create Form
export async function createForm(data: FormInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const validated = formSchema.parse(data);

    const form = await prisma.form.create({
      data: {
        slug: validated.slug,
        title: validated.title,
        description: validated.description,
        body: validated.body,
        coverImage: validated.coverImage,
        status: validated.status,
        userId: auth.userId,
        fields: {
          create: validated.fields.map((field, index) => ({
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            required: field.required,
            options: field.options,
            order: index,
            validation: field.validation ?? {},
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    revalidatePath('/admin/forms');
    return { success: true, data: form };
  } catch (error) {
    console.error('Form creation error:', error);
    if (isUniqueConstraintError(error)) {
      return { success: false, error: '이미 사용 중인 URL 슬러그입니다' };
    }
    return { success: false, error: '폼 생성에 실패했습니다' };
  }
}

// Update Form
export async function updateForm(formId: string, data: FormInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const validated = formSchema.parse(data);

    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    // Form 메타데이터 · 필드 아카이브 · 필드 upsert를 한 트랜잭션으로 묶는다.
    // 예전에는 셋이 따로 실행돼, 중간에 실패하면 필드는 이미 archive됐는데
    // 새 필드는 없는 상태로 남았다(게시된 폼이 필드 없이 뜰 수 있었다).
    const existingFields = await prisma.formField.findMany({
      where: { formId, archived: false },
      select: { id: true },
    });
    const currentFieldIds = existingFields.map((f) => f.id);
    const newFieldIds = new Set(
      validated.fields.map((f) => f.id).filter((id): id is string => !!id)
    );

    // 새 데이터에 없는 기존 필드는 물리 삭제가 아니라 archive 한다.
    // fieldId 관계를 유지해야 과거 응답이 어느 질문의 답인지 남는다.
    const fieldsToArchive = currentFieldIds.filter(
      (id) => !newFieldIds.has(id)
    );

    const updatedForm = await prisma.$transaction(
      async (tx) => {
        await tx.form.update({
          where: { id: formId },
          data: {
            slug: validated.slug,
            title: validated.title,
            description: validated.description,
            body: validated.body,
            coverImage: validated.coverImage,
            status: validated.status,
          },
        });

        if (fieldsToArchive.length > 0) {
          await tx.formField.updateMany({
            where: { id: { in: fieldsToArchive } },
            data: { archived: true },
          });
        }

        for (let index = 0; index < validated.fields.length; index++) {
          const field = validated.fields[index];
          const fieldData = {
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            required: field.required,
            options: field.options,
            order: index,
            validation: field.validation ?? {},
          };

          if (field.id && currentFieldIds.includes(field.id)) {
            await tx.formField.update({
              where: { id: field.id },
              data: fieldData,
            });
          } else {
            await tx.formField.create({
              data: { formId, ...fieldData },
            });
          }
        }

        return tx.form.findUnique({
          where: { id: formId },
          include: {
            fields: { where: { archived: false }, orderBy: { order: 'asc' } },
          },
        });
      },
      // 필드 수만큼 순차 쿼리가 나가므로 기본 5초로는 빠듯하다.
      { timeout: 15000 }
    );

    if (!updatedForm) {
      return { success: false, error: '폼 업데이트 후 조회 실패' };
    }

    revalidatePath('/admin/forms');
    revalidatePath(`/admin/forms/${formId}`);
    return { success: true, data: updatedForm };
  } catch (error) {
    console.error('Form update error:', error);
    if (isUniqueConstraintError(error)) {
      return { success: false, error: '이미 사용 중인 URL 슬러그입니다' };
    }
    return { success: false, error: '폼 수정에 실패했습니다' };
  }
}

// Delete Form
export async function deleteForm(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    await prisma.form.delete({
      where: { id: formId },
    });

    revalidatePath('/admin/forms');
    return { success: true };
  } catch (error) {
    console.error('Form deletion error:', error);
    return {
      success: false,
      error: '폼 삭제에 실패했습니다',
    };
  }
}

// Get Form by Slug (Public)
export async function getFormBySlug(slug: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { slug, status: { not: 'draft' } },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    return { success: true, data: form };
  } catch (error) {
    console.error('Form fetch error:', error);
    return {
      success: false,
      error: '폼을 불러오는데 실패했습니다',
    };
  }
}

// 공개 폼의 파일 필드 업로드 URL 발급
// 인증 없는 공개 경로에서 호출되므로, 실제로 업로드가 허용된 필드인지
// (게시된 폼 + 살아있는 file 필드) 서버에서 확인한 뒤에만 발급한다
export async function getFormFileUploadUrl(formId: string, fieldId: string) {
  try {
    const ip = await getClientIp();
    if (
      !checkRateLimit(
        `form-upload:ip:${ip}`,
        UPLOAD_URL_IP_LIMIT,
        SUBMIT_IP_WINDOW_MS
      )
    ) {
      return {
        success: false,
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    const field = await prisma.formField.findFirst({
      where: {
        id: fieldId,
        formId,
        type: 'file',
        archived: false,
        form: { status: 'published' },
      },
      select: { id: true },
    });

    if (!field) {
      return { success: false, error: '업로드할 수 없는 항목입니다' };
    }

    const { uploadURL, imageUrl } = await getCloudflareImageUrl();
    return { success: true, data: { uploadURL, imageUrl } };
  } catch (error) {
    console.error('Form file upload URL error:', error);
    return { success: false, error: '업로드 준비에 실패했습니다' };
  }
}

// Submit Form Response
export async function submitFormResponse(
  formId: string,
  responses: Record<string, string | string[]>
) {
  try {
    // IP·UA는 호출자가 넘긴 값을 쓰지 않는다. 서버액션은 공개 RPC라
    // 인자로 받으면 제출자가 마음대로 정할 수 있고(어드민에 보이는 IP가
    // 위조된다), rate limit도 그대로 우회된다.
    const ip = await getClientIp();
    const userAgent = (await headers()).get('user-agent') ?? undefined;

    if (
      !checkRateLimit(
        `form-submit:ip:${ip}`,
        SUBMIT_IP_LIMIT,
        SUBMIT_IP_WINDOW_MS
      )
    ) {
      return {
        success: false,
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // Get form with fields
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          where: { archived: false },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    // Check if form is accepting responses
    if (form.status !== 'published') {
      return {
        success: false,
        error:
          form.status === 'closed'
            ? '해당 양식은 응답을 받지 않습니다'
            : '게시되지 않은 양식입니다',
      };
    }

    // Validate responses
    const schema = createFormResponseSchema(
      form.fields.map((f) => ({
        ...f,
        placeholder: f.placeholder ?? undefined,
        helpText: f.helpText ?? undefined,
        validation: f.validation as Record<string, unknown> | undefined,
      }))
    );
    // schema.parse가 던지면 ZodError.message(=issues JSON)가 그대로
    // 사용자에게 갔다. 스키마가 이미 한국어 메시지를 담고 있으므로 그걸 쓴다.
    const parsed = parseInput(schema, responses);
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }
    const validated = parsed.data;

    // file 필드는 우리가 발급한 Cloudflare Images URL만 저장한다.
    // 인증 없는 공개 경로라 클라이언트 값을 그대로 믿을 수 없는데,
    // 스키마는 클라이언트와 공유되므로 서버 전용 계정 해시를 참조할 수 없다.
    // (업로드가 실제로 완료됐는지까지는 확인하지 않는다 — 아래 주석 참고)
    const imagePrefix = `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_HASH}/`;
    for (const f of form.fields) {
      if (f.type !== 'file') continue;
      const value = (validated as Record<string, unknown>)[f.id];
      if (typeof value === 'string' && value !== '') {
        if (!value.startsWith(imagePrefix)) {
          return { success: false, error: '허용되지 않은 첨부 파일입니다' };
        }
      }
    }

    // 🔒 안전장치 1: 빈 응답 제출 방지
    const responseEntries = Object.entries(validated);
    if (responseEntries.length === 0) {
      return {
        success: false,
        error: '응답 데이터가 없습니다. 최소 하나 이상의 필드를 입력해주세요.',
      };
    }

    // Create field lookup map for snapshot
    const fieldMap = new Map(form.fields.map((f) => [f.id, f]));

    // 🔒 안전장치 2: 트랜잭션으로 제출과 응답을 원자적으로 생성
    const submission = await prisma.$transaction(async (tx) => {
      // Create submission with responses
      const newSubmission = await tx.formSubmission.create({
        data: {
          formId,
          ipAddress: ip === 'unknown' ? null : ip,
          userAgent,
          responses: {
            create: responseEntries.map(([fieldId, value]) => {
              const field = fieldMap.get(fieldId);
              return {
                fieldId,
                fieldLabel: field?.label ?? 'Unknown Field',
                fieldType: field?.type ?? 'text',
                value:
                  typeof value === 'string' ? value : JSON.stringify(value),
              };
            }),
          },
        },
        include: {
          responses: {
            include: {
              field: true,
            },
          },
        },
      });

      // 🔒 안전장치 3: 응답 개수 검증
      if (newSubmission.responses.length !== responseEntries.length) {
        throw new Error(
          `응답 저장 실패: ${responseEntries.length}개 중 ${newSubmission.responses.length}개만 저장됨`
        );
      }

      return newSubmission;
    });

    return { success: true, data: submission };
  } catch (error) {
    console.error('Form submission error:', error);
    return { success: false, error: '제출에 실패했습니다' };
  }
}

// Get Form Submissions (Admin only)
export async function getFormSubmissions(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        title: true,
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      include: {
        responses: {
          // field 전체(options/validation 등)를 응답마다 중복 로드하지 않도록
          // 뷰가 실제로 쓰는 필드만 select
          include: {
            field: {
              select: { id: true, label: true, type: true, archived: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        form: {
          title: form.title,
          fields: form.fields,
        },
        submissions,
      },
    };
  } catch (error) {
    console.error('Submissions fetch error:', error);
    return {
      success: false,
      error: '제출 내역을 불러오는데 실패했습니다',
    };
  }
}

// Get Form (Admin)
export async function getForm(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    return { success: true, data: form };
  } catch (error) {
    console.error('Form fetch error:', error);
    return {
      success: false,
      error: '폼을 불러오는데 실패했습니다',
    };
  }
}

// List Forms (Admin)
export async function listForms(filters?: {
  status?: 'draft' | 'published' | 'closed';
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const forms = await prisma.form.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, data: forms };
  } catch (error) {
    console.error('Forms list error:', error);
    return {
      success: false,
      error: '폼 목록을 불러오는데 실패했습니다',
    };
  }
}

// Copy Form (Admin)
export async function copyForm(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    // Get original form
    const original = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!original) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    // Generate new slug (avoid duplicates)
    const timestamp = Date.now();
    const baseSlug = `${original.slug}-copy-${timestamp}`;
    let newSlug = baseSlug;
    let counter = 1;

    // Check for slug uniqueness
    while (true) {
      const existing = await prisma.form.findUnique({
        where: { slug: newSlug },
      });
      if (!existing) break;
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create new form with copied data (excluding submissions/responses)
    const copiedForm = await prisma.form.create({
      data: {
        slug: newSlug,
        title: `Copy of ${original.title}`,
        description: original.description,
        body: original.body,
        coverImage: original.coverImage,
        status: 'draft', // Always draft for copied forms
        userId: auth.userId, // Current user becomes owner
        fields: {
          create: original.fields.map((field) => ({
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            required: field.required,
            options: field.options,
            order: field.order,
            validation: field.validation ?? {},
          })),
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    revalidatePath('/admin/forms');
    return { success: true, data: copiedForm };
  } catch (error) {
    console.error('Form copy error:', error);
    return { success: false, error: '폼 복사에 실패했습니다' };
  }
}
