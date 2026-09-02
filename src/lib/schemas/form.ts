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

// Form Field Schema (임시저장 시에는 완화된 검증)
export const formFieldSchema = z.object({
  id: z.string().optional(),
  type: fieldTypeEnum,
  label: z.string().min(1, '필드 레이블을 입력해주세요'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  order: z.number().default(0),
  validation: z.record(z.string(), z.any()).optional(),
});

// Published 상태에서 사용할 엄격한 필드 검증
export const strictFormFieldSchema = formFieldSchema.refine(
  (data) => {
    // select, multiselect, radio, checkbox 타입은 최소 1개의 옵션 필요
    const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'];
    if (needsOptions.includes(data.type)) {
      return data.options && data.options.length > 0;
    }
    return true;
  },
  {
    message: '선택형 필드는 최소 1개의 선택지가 필요합니다',
    path: ['options'],
  }
);

// Form Creation/Update Schema
export const formSchema = z
  .object({
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
    fields: z.array(formFieldSchema).default([]),
  })
  .refine(
    (data) => {
      // 게시 상태일 때만 필드 필수
      if (data.status === 'published') {
        return data.fields.length > 0;
      }
      return true;
    },
    {
      message: '게시하려면 최소 1개의 필드가 필요합니다',
      path: ['fields'],
    }
  )
  .refine(
    (data) => {
      // 게시 상태일 때 선택형 필드는 옵션 필수
      if (data.status === 'published') {
        const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'];
        return data.fields.every((field) => {
          if (needsOptions.includes(field.type)) {
            return field.options && field.options.length > 0;
          }
          return true;
        });
      }
      return true;
    },
    {
      message: '게시하려면 선택형 필드에 최소 1개의 선택지가 필요합니다',
      path: ['fields'],
    }
  );

// Form Submission Schema (dynamic based on form fields)
export const createFormResponseSchema = (
  fields: z.infer<typeof formFieldSchema>[]
) => {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    // 숫자는 별도 처리한다.
    // 아래 공통 분기의 .min(1)은 숫자에 걸면 "길이 1 이상"이 아니라
    // "값이 1 이상"이라, 필수 항목에 0·음수·소수를 넣어도 '입력해주세요'로
    // 반려됐다. 빈 값 여부는 문자열 단계에서 판정하고 그 뒤에 숫자로 바꾼다.
    if (field.type === 'number') {
      const numberError = '숫자를 입력해주세요';
      const asNumber = z.coerce.number<string>({ error: numberError });
      const asTrimmed = z.coerce.string().trim();

      shape[field.id!] = field.required
        ? asTrimmed.min(1, `${field.label}을(를) 입력해주세요`).pipe(asNumber)
        : asTrimmed
            .pipe(z.union([z.literal(''), asNumber], { error: numberError }))
            .optional();
      continue;
    }

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('유효한 이메일을 입력해주세요');
        break;
      case 'phone':
        fieldSchema = z
          .string()
          .regex(
            /^01[0-9]{8,9}$/,
            '유효한 전화번호를 입력해주세요 (숫자만 10~11자리)'
          );
        break;
      case 'url':
        fieldSchema = z.string().url('유효한 URL을 입력해주세요');
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
          ? (fieldSchema as z.ZodArray<z.ZodString>)
              .refine((val) => val.length > 0, {
                message: `${field.label}을(를) 선택해주세요`,
              })
              .default([])
          : (fieldSchema as z.ZodString).min(
              1,
              `${field.label}을(를) 입력해주세요`
            );
    } else {
      // 선택 항목은 '미입력'(빈 문자열)을 허용한다.
      // FormRenderer가 모든 필드의 defaultValue를 ''로 두기 때문에,
      // z.string().email().optional() 같은 스키마는 비워둔 선택 항목을
      // 형식 오류로 막아버렸다(email/phone/date/url 전부 해당).
      fieldSchema = z.union([z.literal(''), fieldSchema]).optional();
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
