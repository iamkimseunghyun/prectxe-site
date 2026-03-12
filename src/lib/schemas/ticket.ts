import { z } from 'zod';

// ─── TicketTier ───────────────────────────────────────

export const ticketTierSchema = z.object({
  name: z.string().min(1, '등급 이름을 입력해주세요.'),
  description: z.string().optional(),
  price: z.coerce.number().int().min(0, '가격은 0원 이상이어야 합니다.'),
  quantity: z.coerce.number().int().min(1, '수량은 1장 이상이어야 합니다.'),
  maxPerOrder: z.coerce.number().int().min(1).max(20).default(4),
  saleStart: z.string().optional(),
  saleEnd: z.string().optional(),
  order: z.coerce.number().int().default(0),
});

export type TicketTierInput = z.infer<typeof ticketTierSchema>;

// ─── Order (구매자 입력) ──────────────────────────────

export const orderFormSchema = z.object({
  buyerName: z.string().min(1, '이름을 입력해주세요.'),
  buyerEmail: z.string().email('올바른 이메일을 입력해주세요.'),
  buyerPhone: z
    .string()
    .min(10, '전화번호를 입력해주세요.')
    .regex(/^01[016789]\d{7,8}$/, '올바른 전화번호 형식이 아닙니다.'),
  items: z
    .array(
      z.object({
        ticketTierId: z.string(),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1, '최소 1개 이상의 티켓을 선택해주세요.'),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;
