import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

export const PASSWORD_MIN_LENGTH = 6;

const checkPassword = ({
  password,
  confirm_password,
}: {
  password: string;
  confirm_password: string;
}) => password === confirm_password;

export const signUpFormSchema = z
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
  .superRefine(async ({ username }, ctx) => {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (user) {
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
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
      },
    });
    if (user) {
      ctx.addIssue({
        code: 'custom',
        message: '이미 사용하고 있는 이메일입니다.',
        path: ['email'],
        fatal: true,
      });
      return z.NEVER;
    }
  })
  .refine(checkPassword, {
    message: '비밀번호와 비밀번호 확인이 맞지 않습니다.',
    path: ['password'],
  });
