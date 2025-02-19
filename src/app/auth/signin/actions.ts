'use server';

import { z } from 'zod';
import bcrypt from 'bcrypt';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db/prisma';
import getSession from '@/lib/session';
import { makeLogin } from '@/lib/make-login';

const checkUsernameExists = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: { id: true },
  });

  return Boolean(user);
};

const loginFormSchema = z.object({
  username: z.string().toLowerCase().refine(checkUsernameExists, {
    message: '이메일 사용자가 존재하지 않습니다.',
  }),
  password: z.string({
    required_error: '비밀번호는 반드시 입력해야 합니다.',
  }),
});

type FormState = {
  fieldErrors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirm_password?: string[];
  };
  formErrors?: string[];
};

export const signIn = async (
  prevState: FormState | null,
  formData: FormData
) => {
  const data = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const result = await loginFormSchema.safeParseAsync(data);

  if (!result.success) {
    return result.error.flatten();
  } else {
    const user = await prisma.user.findUnique({
      where: {
        username: result.data.username,
      },
      select: { id: true, password: true },
    });
    const ok = await bcrypt.compare(
      result.data.password,
      user!.password ?? 'xxx'
    );

    if (ok) {
      await makeLogin(user!.id);
      return redirect('/profile');
    } else {
      return {
        success: false,
        fieldErrors: {
          password: ['비밀번호가 틀렸습니다.'],
          username: [],
        },
        message: 'Invalid signin credentials',
      };
    }
  }
};

export async function isAdmin(userId: string) {
  const session = await getSession();
  if (session.id) {
    return session.id === userId;
  }
  return false;
}
