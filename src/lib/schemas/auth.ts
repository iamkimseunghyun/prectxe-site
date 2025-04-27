import { z } from 'zod';

// 정규식 및 상수
export const PASSWORD_MIN_LENGTH = 6;

// 로그인 스키마
export const signInSchema = z.object({
  username: z
    .string()
    .toLowerCase()
    .trim()
    .min(1, '사용자 이름은 필수 입니다.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, '비밀번호는 반드시 입력해야 합니다.'),
});

// 회원가입 스키마
export const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, '사용자 이름을 2자 이상 입력해주세요.')
      .toLowerCase()
      .trim(),
    email: z.string().email('이메일을 정확히 입력해주세요.').toLowerCase(),
    password: z.string().min(PASSWORD_MIN_LENGTH, {
      message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자리 이상 입력되어야 합니다.`,
    }),
    confirm_password: z.string().min(PASSWORD_MIN_LENGTH, {
      message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자리 이상 입력되어야 합니다.`,
    }),
  })
  .refine(({ password, confirm_password }) => password === confirm_password, {
    message: '비밀번호와 비밀번호 확인이 맞지 않습니다.',
    path: ['password'],
  });

// 타입 내보내기
export type LoginCredentials = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
