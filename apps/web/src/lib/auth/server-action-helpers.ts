import type { z } from 'zod';

/**
 * Server Action들이 공통으로 리턴하는 결과 타입.
 * - success: true 면 data(있을 수도)를 리턴
 * - success: false 면 사용자에게 보여줄 한국어 error 메시지를 리턴
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Zod 스키마로 입력값 파싱 + 첫 에러 메시지 추출.
 * 모든 server action에서 동일하게 쓰이던 4줄 패턴을 1줄로:
 *
 *   const parsed = parseInput(mySchema, data);
 *   if (!parsed.success) return parsed;
 *
 * 그 다음은 parsed.data 사용.
 */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.',
    };
  }
  return { success: true, data: result.data };
}
