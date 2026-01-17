'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import type { FormFieldInput, FormInput } from '@/lib/schemas/form';
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
  data: FormInput
) {
  try {
    const validated = formSchema.parse(data);

    // Check ownership
    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
    }

    // Delete existing fields and create new ones
    await prisma.formField.deleteMany({
      where: { formId },
    });

    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        slug: validated.slug,
        title: validated.title,
        description: validated.description,
        coverImage: validated.coverImage,
        status: validated.status,
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
    revalidatePath(`/admin/forms/${formId}`);
    return { success: true, data: form };
  } catch (error) {
    console.error('Form update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '폼 수정에 실패했습니다',
    };
  }
}

// Delete Form
export async function deleteForm(formId: string, userId: string) {
  try {
    const existing = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
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
      where: { id: formId, status: 'published' },
      include: {
        fields: true,
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
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

    // Create submission with responses
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        responses: {
          create: Object.entries(validated).map(([fieldId, value]) => ({
            fieldId,
            value: typeof value === 'string' ? value : JSON.stringify(value),
          })),
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
export async function getFormSubmissions(formId: string, userId: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true },
    });

    if (!form || form.userId !== userId) {
      return { success: false, error: '권한이 없습니다' };
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      include: {
        responses: {
          include: {
            field: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return { success: true, data: submissions };
  } catch (error) {
    console.error('Submissions fetch error:', error);
    return {
      success: false,
      error: '제출 내역을 불러오는데 실패했습니다',
    };
  }
}

// List Forms (Admin)
export async function listForms(userId: string) {
  try {
    const forms = await prisma.form.findMany({
      where: { userId },
      include: {
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
