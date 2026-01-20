import { z } from 'zod';

// Enums matching Prisma schema
export const formStatusEnum = z.enum(['draft', 'published', 'closed']);
export const fieldTypeEnum = z.enum([
  'text',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'date',
  'email',
  'phone',
  'url',
  'file',
  'number',
]);

// Form Field Schema
export const formFieldSchema = z.object({
  id: z.string().optional(),
  type: fieldTypeEnum,
  label: z.string().min(1, '필드 레이블을 입력해주세요'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  order: z.number().default(0),
  validation: z.record(z.any()).optional(),
});

// Form Creation/Update Schema
export const formSchema = z.object({
  slug: z
    .string()
    .min(1, 'URL 슬러그를 입력해주세요')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'URL 슬러그는 소문자, 숫자, 하이픈만 사용 가능합니다'
    ),
  title: z.string().min(1, '폼 제목을 입력해주세요'),
  description: z.string().optional(),
  body: z.string().optional(),
  coverImage: z.string().optional(),
  status: formStatusEnum.default('draft'),
  fields: z.array(formFieldSchema).min(1, '최소 1개의 필드가 필요합니다'),
});

// Form Submission Schema (dynamic based on form fields)
export const createFormResponseSchema = (
  fields: z.infer<typeof formFieldSchema>[]
) => {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('유효한 이메일을 입력해주세요');
        break;
      case 'phone':
        fieldSchema = z
          .string()
          .regex(
            /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
            '유효한 전화번호를 입력해주세요'
          );
        break;
      case 'url':
        fieldSchema = z.string().url('유효한 URL을 입력해주세요');
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'date':
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        break;
      case 'checkbox':
      case 'multiselect':
        fieldSchema = z.array(z.string());
        break;
      case 'file':
        fieldSchema = z.string(); // Will be Cloudflare image URL
        break;
      default:
        fieldSchema = z.string();
    }

    if (field.required) {
      fieldSchema =
        field.type === 'checkbox' || field.type === 'multiselect'
          ? fieldSchema
              .refine((val) => val.length > 0, {
                message: `${field.label}을(를) 선택해주세요`,
              })
              .default([])
          : (fieldSchema as z.ZodString).min(
              1,
              `${field.label}을(를) 입력해주세요`
            );
    } else {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.id!] = fieldSchema;
  }

  return z.object(shape);
};

// Type exports
export type FormStatus = z.infer<typeof formStatusEnum>;
export type FieldType = z.infer<typeof fieldTypeEnum>;
export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type FormInput = z.infer<typeof formSchema>;
