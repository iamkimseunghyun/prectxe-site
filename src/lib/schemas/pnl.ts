import { z } from 'zod';

export const pnlRowTypeSchema = z.enum(['header', 'item', 'subtotal']);
export const pnlSectionSchema = z.enum(['revenue', 'expense']);
export const pnlCostTypeSchema = z.enum(['fixed', 'variable']);
export const pnlInputModeSchema = z.enum(['amount', 'qty_price']);

export const pnlCellSchema = z.object({
  qty: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
});

export const pnlRowSchema = z.object({
  id: z.string().min(1),
  type: pnlRowTypeSchema,
  section: pnlSectionSchema,
  costType: pnlCostTypeSchema.nullable().optional(),
  label: z.string(),
  inputMode: pnlInputModeSchema,
  values: z.record(z.string(), pnlCellSchema),
});

export const pnlScenariosSchema = z
  .array(z.string().min(1).max(40))
  .min(1)
  .max(8);

export const pnlSheetSchema = z.object({
  name: z.string().min(1, '시트 이름을 입력하세요').max(120),
  projectName: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  templateId: z.string().nullable().optional(),
  scenarios: pnlScenariosSchema,
  rows: z.array(pnlRowSchema),
});

export const pnlTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름을 입력하세요').max(120),
  description: z.string().max(500).nullable().optional(),
  scenarios: pnlScenariosSchema,
  rows: z.array(pnlRowSchema),
});

export type PnLRow = z.infer<typeof pnlRowSchema>;
export type PnLCell = z.infer<typeof pnlCellSchema>;
export type PnLSheetInput = z.infer<typeof pnlSheetSchema>;
export type PnLTemplateInput = z.infer<typeof pnlTemplateSchema>;
export type PnLSection = z.infer<typeof pnlSectionSchema>;
export type PnLCostType = z.infer<typeof pnlCostTypeSchema>;
export type PnLInputMode = z.infer<typeof pnlInputModeSchema>;
export type PnLRowType = z.infer<typeof pnlRowTypeSchema>;
