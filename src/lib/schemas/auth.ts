import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

// 정규식 및 상수
export const PASSWORD_MIN_LENGTH = 6;

// 사용자 이름 중복 확인 함수
const checkUsernameExists = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return Boolean(user);
};

// 이메일 중복 확인 함수
const checkEmailExists = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(user);
};

// 로그인 스키마
export const loginSchema = z.object({
  username: z.string().toLowerCase().trim(),
  password: z.string({
    required_error: '비밀번호는 반드시 입력해야 합니다.',
  }),
});

// 회원가입 스키마
export const signUpSchema = z
  .object({
    username: z
      .string({
        invalid_type_error: '사용자 이름은 문자로 입력해야 합니다.',
        required_error: '사용자 이름은 필수로 입력해야 합니다.',
      })
      .toLowerCase()
      .trim(),
    email: z.string().email().toLowerCase(),
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
  })
  .superRefine(async ({ username }, ctx) => {
    if (await checkUsernameExists(username)) {
      ctx.addIssue({
        code: 'custom',
        message: '이미 사용하고 있는 이름입니다.',
        path: ['username'],
        fatal: true,
      });
      return z.NEVER;
    }
  })
  .superRefine(async ({ email }, ctx) => {
    if (await checkEmailExists(email)) {
      ctx.addIssue({
        code: 'custom',
        message: '이미 사용하고 있는 이메일입니다.',
        path: ['email'],
        fatal: true,
      });
      return z.NEVER;
    }
  });

// 타입 내보내기
export type LoginCredentials = z.infer<typeof loginSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
