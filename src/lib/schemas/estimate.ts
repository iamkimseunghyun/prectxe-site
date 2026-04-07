import { z } from 'zod';

export const supplierProfileSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력하세요').max(120),
  businessNo: z.string().max(40).nullable().optional(),
  ceo: z.string().max(60).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z
    .string()
    .email('유효한 이메일이 아닙니다')
    .nullable()
    .or(z.literal(''))
    .optional(),
  contactName: z.string().max(60).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  sealUrl: z.string().nullable().optional(),
  defaultValidityDays: z.number().int().min(0).max(365).default(30),
  watermarkText: z.string().max(40).nullable().optional(),
});

export type SupplierProfileInput = z.infer<typeof supplierProfileSchema>;

export const recipientSchema = z.object({
  companyName: z.string().min(1, '수신자 회사명을 입력하세요').max(120),
  contactName: z.string().max(60).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  email: z.string().nullable().optional(),
});

export type Recipient = z.infer<typeof recipientSchema>;

export const lineItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, '항목명을 입력하세요').max(200),
  spec: z.string().max(120).nullable().optional(),
  qty: z.number().min(0),
  unitPrice: z.number().min(0),
  note: z.string().max(200).nullable().optional(),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const estimateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  issueDate: z.coerce.date(),
  validUntil: z.coerce.date().nullable().optional(),
  supplier: supplierProfileSchema.omit({ defaultValidityDays: true }),
  recipient: recipientSchema,
  lineItems: z.array(lineItemSchema).min(1, '최소 1개 항목이 필요합니다'),
  notes: z.string().max(2000).nullable().optional(),
  sourceSheetId: z.string().nullable().optional(),
  sourceScenario: z.string().nullable().optional(),
});

export type EstimateInput = z.infer<typeof estimateSchema>;

export const createEstimateFromSheetSchema = z.object({
  sheetId: z.string().min(1),
  scenario: z.string().min(1),
  title: z.string().min(1).max(200),
  itemRowIds: z.array(z.string()).min(1, '최소 1개 항목을 선택하세요'),
  recipient: recipientSchema,
  validUntil: z.coerce.date().nullable().optional(),
});

export type CreateEstimateFromSheetInput = z.infer<
  typeof createEstimateFromSheetSchema
>;
