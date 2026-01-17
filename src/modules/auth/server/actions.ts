'use server';

import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { signInSchema, signUpSchema } from '@/lib/schemas';

interface SessionContent {
  id?: string;
  name?: string;
  isAdmin?: boolean;
}

export default async function getSession() {
  return getIronSession<SessionContent>(await cookies(), {
    cookieName: 'prectxe',
    password: process.env.COOKIE_PASSWORD!,
  });
}

export async function makeLogin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const session = await getSession();
  session.id = user.id;
  session.name = user.username ?? undefined;
  session.isAdmin = user.role === 'ADMIN';

  console.log('makeLogin - user:', {
    id: user.id,
    username: user.username,
    role: user.role,
    isAdmin: session.isAdmin,
  });

  await session.save();
}

export async function makeLogout() {
  const session = await getSession();
  session.destroy();
}

export async function signUp(data: z.infer<typeof signUpSchema>) {
  const result = signUpSchema.safeParse(data);

  if (!result.success) {
    const flattenedErrors = result.error.flatten();
    return {
      success: false,
      errors: {
        _form: flattenedErrors,
        ...flattenedErrors.fieldErrors,
      },
    };
  }
  try {
    const hashedPassword = await bcrypt.hash(result.data.password, 12);
    // const hashedPassword = await Bun.password.hash(result.data.password);

    const user = await prisma.user.create({
      data: {
        username: result.data.username,
        email: result.data.email,
        password: hashedPassword,
      },
      select: {
        id: true,
      },
    });

    await makeLogin(user.id);
    return { success: true, redirect: '/auth/signin' };
  } catch (error) {
    console.error('Failed to create user:', error);
    return {
      success: false,
      errors: {
        _form: {
          message: '회원가입 중 오류가 발생했습니다.',
        },
      },
    };
  }
}

export const signIn = async (data: z.infer<typeof signInSchema>) => {
  const result = signInSchema.safeParse(data);

  if (!result.success) {
    const flattenedErrors = result.error.flatten();
    return {
      success: false,
      errors: {
        _form: flattenedErrors.formErrors, // 폼 전체 에러
        ...flattenedErrors.fieldErrors, // 필드별 에러
      },
    };
  }
  try {
    console.log('signIn - attempting login for:', result.data.username);
    const user = await prisma.user.findUnique({
      where: {
        username: result.data.username,
      },
      select: { id: true, password: true },
    });

    console.log('signIn - user found:', user ? 'yes' : 'no');

    // 사용자 없거나 비밀번호 없으면 실패 처리
    if (!user || !user.password) {
      console.log('signIn - user or password missing');
      return {
        success: false,
        errors: { _form: ['사용자 이름 또는 비밀번호가 잘못되었습니다.'] },
      };
    }

    // const ok = await Bun.password.verify(result.data.password, user.password);
    const ok = await bcrypt.compare(result.data.password, user.password);
    console.log('signIn - password check:', ok ? 'success' : 'failed');

    if (ok) {
      await makeLogin(user!.id);
      return { success: true, redirect: '/admin' };
    } else {
      return {
        success: false,
        errors: {
          _form: ['사용자 이름 또는 비밀번호가 잘못되었습니다.'],
          // 필요하다면 필드 지정 가능하나 보안상 권장하지 않음
          // password: ['비밀번호가 틀렸습니다.'],
        },
      };
    }
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      errors: { _form: ['로그인 처리 중 오류가 발생했습니다.'] },
    };
  }
};

export const signOut = async () => {
  try {
    await makeLogout();
    return { success: true };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      errors: { _form: ['로그아웃 처리 중 오류가 발생했습니다.'] },
    };
  }
};
