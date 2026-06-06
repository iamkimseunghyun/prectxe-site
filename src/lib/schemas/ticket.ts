import { z } from 'zod';

// 전화번호 — 국내(010…) + 해외(+국가코드, 공백·하이픈·괄호 허용) 모두 수용.
// 숫자만 추출해 7~15자리(E.164) 검증.
const phoneSchema = z
  .string()
  .trim()
  .min(7, '전화번호를 입력해주세요.')
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    return (
      /^\+?[\d\s().-]+$/.test(v) && digits.length >= 7 && digits.length <= 15
    );
  }, '올바른 전화번호 형식이 아닙니다.');

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

// ─── GoodsVariant ────────────────────────────────────

export const goodsVariantSchema = z.object({
  name: z.string().min(1, '옵션 이름을 입력해주세요.'),
  price: z.coerce.number().int().min(0, '가격은 0원 이상이어야 합니다.'),
  stock: z.coerce.number().int().min(0, '재고는 0개 이상이어야 합니다.'),
  options: z.string().optional(), // JSON string
  order: z.coerce.number().int().default(0),
});

export type GoodsVariantInput = z.infer<typeof goodsVariantSchema>;

// ─── Order (구매자 입력) ──────────────────────────────

export const orderFormSchema = z.object({
  buyerName: z.string().min(1, '이름을 입력해주세요.'),
  buyerEmail: z.string().email('올바른 이메일을 입력해주세요.'),
  buyerPhone: phoneSchema,
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

// ─── Goods Order (구매자 입력) ───────────────────────

export const goodsOrderFormSchema = z.object({
  buyerName: z.string().min(1, '이름을 입력해주세요.'),
  buyerEmail: z.string().email('올바른 이메일을 입력해주세요.'),
  buyerPhone: phoneSchema,
  items: z
    .array(
      z.object({
        goodsVariantId: z.string(),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1, '최소 1개 이상의 상품을 선택해주세요.'),
});

export type GoodsOrderFormInput = z.infer<typeof goodsOrderFormSchema>;

// ─── Bank Transfer Order (무통장 입금 — 티켓) ─────────

export const bankTransferOrderFormSchema = z.object({
  buyerName: z.string().min(1, '이름을 입력해주세요.'),
  buyerEmail: z.string().email('올바른 이메일을 입력해주세요.'),
  buyerPhone: phoneSchema,
  depositorName: z
    .string()
    .min(1, '입금자명을 입력해주세요.')
    .max(20, '입금자명은 20자 이내로 입력해주세요.'),
  items: z
    .array(
      z.object({
        ticketTierId: z.string(),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1, '최소 1개 이상의 티켓을 선택해주세요.'),
});

export type BankTransferOrderFormInput = z.infer<
  typeof bankTransferOrderFormSchema
>;
