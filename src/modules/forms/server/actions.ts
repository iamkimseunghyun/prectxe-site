'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import type { FormInput } from '@/lib/schemas/form';
import { createFormResponseSchema, formSchema } from '@/lib/schemas/form';

// Create Form
export async function createForm(userId: string, data: FormInput) {
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
        userId,
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
    return {
      success: false,
      error: error instanceof Error ? error.message : '폼 생성에 실패했습니다',
    };
  }
}

// Update Form
export async function updateForm(
  formId: string,
  userId: string,
  data: FormInput,
  isAdmin = false
) {
  try {
    const validated = formSchema.parse(data);

    // Check ownership
    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true },
    });

    if (!existing) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    if (!isAdmin && existing.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
    }

    // 🚨 버그 수정: FormField를 삭제하지 않고 upsert로 업데이트
    // FormField 삭제 시 FormResponse의 fieldId가 NULL이 되어 데이터 유실 위험
    // 대신 기존 필드는 업데이트하고, 새 필드만 생성

    // 먼저 Form의 메타데이터만 업데이트 (fields 제외)
    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        slug: validated.slug,
        title: validated.title,
        description: validated.description,
        body: validated.body,
        coverImage: validated.coverImage,
        status: validated.status,
      },
      include: {
        fields: {
          where: { archived: false },
        },
      },
    });

    // 필드 변경사항이 있는 경우에만 처리
    const currentFieldIds = form.fields.map((f) => f.id);
    const newFieldIds = validated.fields
      .map((f) => f.id)
      .filter((id): id is string => !!id);

    // 삭제할 필드 (기존 필드 중 새 데이터에 없는 것)
    const fieldsToDelete = currentFieldIds.filter(
      (id) => !newFieldIds.includes(id)
    );

    // 🔒 안전장치: 필드 soft delete (archived)로 데이터 무결성 보존
    // fieldId 관계를 유지하여 동일 라벨 필드가 여러 개일 때도 정확한 응답 매칭 가능
    if (fieldsToDelete.length > 0) {
      await prisma.formField.updateMany({
        where: {
          id: { in: fieldsToDelete },
        },
        data: {
          archived: true,
        },
      });

      console.log(
        `✅ 필드 ${fieldsToDelete.length}개 아카이브됨. fieldId 관계 유지.`
      );
    }

    // 🔒 안전장치: 필드 업데이트/생성을 트랜잭션으로 보호
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < validated.fields.length; index++) {
        const field = validated.fields[index];

        if (field.id && currentFieldIds.includes(field.id)) {
          // 기존 필드 업데이트
          await tx.formField.update({
            where: { id: field.id },
            data: {
              type: field.type,
              label: field.label,
              placeholder: field.placeholder,
              helpText: field.helpText,
              required: field.required,
              options: field.options,
              order: index,
              validation: field.validation ?? {},
            },
          });
        } else {
          // 새 필드 생성
          await tx.formField.create({
            data: {
              formId,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder,
              helpText: field.helpText,
              required: field.required,
              options: field.options,
              order: index,
              validation: field.validation ?? {},
            },
          });
        }
      }
    });

    // 최종 Form 데이터 조회
    const updatedForm = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!updatedForm) {
      return { success: false, error: '폼 업데이트 후 조회 실패' };
    }

    revalidatePath('/admin/forms');
    revalidatePath(`/admin/forms/${formId}`);
    return { success: true, data: updatedForm };
  } catch (error) {
    console.error('Form update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '폼 수정에 실패했습니다',
    };
  }
}

// Delete Form
export async function deleteForm(
  formId: string,
  userId: string,
  isAdmin = false
) {
  try {
    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true },
    });

    if (!existing) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    if (!isAdmin && existing.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
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
      where: { slug, status: 'published' },
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

// Submit Form Response
export async function submitFormResponse(
  formId: string,
  responses: Record<string, string | string[]>,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
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
    const validated = schema.parse(responses);

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
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
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
    return {
      success: false,
      error: error instanceof Error ? error.message : '제출에 실패했습니다',
    };
  }
}

// Get Form Submissions (Admin only)
export async function getFormSubmissions(
  formId: string,
  userId: string,
  isAdmin = false
) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        userId: true,
        title: true,
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    if (!isAdmin && form.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      include: {
        responses: {
          include: {
            field: true,
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
export async function getForm(formId: string, userId: string, isAdmin = false) {
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

    if (!isAdmin && form.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
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
export async function listForms(
  userId: string,
  isAdmin = false,
  filters?: {
    status?: 'draft' | 'published' | 'closed';
  }
) {
  try {
    const forms = await prisma.form.findMany({
      where: {
        ...(isAdmin ? {} : { userId }),
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
export async function copyForm(
  formId: string,
  userId: string,
  isAdmin = false
) {
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

    if (!isAdmin && original.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
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
        userId, // Current user becomes owner
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
    return {
      success: false,
      error: error instanceof Error ? error.message : '폼 복사에 실패했습니다',
    };
  }
}
