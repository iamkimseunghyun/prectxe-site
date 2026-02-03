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
    console.log('signUp - attempting to create user:', result.data.username);

    // Check if username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: result.data.username }, { email: result.data.email }],
      },
      select: { username: true, email: true },
    });

    if (existingUser) {
      const isDuplicateUsername =
        existingUser.username === result.data.username;
      const isDuplicateEmail = existingUser.email === result.data.email;

      console.log('signUp - duplicate found:', {
        username: isDuplicateUsername,
        email: isDuplicateEmail,
      });

      if (isDuplicateUsername && isDuplicateEmail) {
        return {
          success: false,
          errors: {
            _form: ['이미 사용 중인 아이디와 이메일입니다.'],
          },
        };
      }
      if (isDuplicateUsername) {
        return {
          success: false,
          errors: {
            username: ['이미 사용 중인 아이디입니다.'],
          },
        };
      }
      if (isDuplicateEmail) {
        return {
          success: false,
          errors: {
            email: ['이미 사용 중인 이메일입니다.'],
          },
        };
      }
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 12);

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

    console.log('signUp - user created successfully:', user.id);

    await makeLogin(user.id);
    return { success: true, redirect: '/auth/signin' };
  } catch (error) {
    console.error('signUp - Failed to create user:', error);

    // Handle Prisma unique constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return {
          success: false,
          errors: {
            _form: [
              '이미 사용 중인 아이디 또는 이메일입니다. 다른 정보로 시도해주세요.',
            ],
          },
        };
      }

      // Development mode: show actual error
      if (process.env.NODE_ENV === 'development') {
        return {
          success: false,
          errors: {
            _form: [`회원가입 실패: ${error.message}`],
          },
        };
      }
    }

    return {
      success: false,
      errors: {
        _form: ['회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'],
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
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
      },
    });

    // Development: More specific error messages
    const isDev = process.env.NODE_ENV === 'development';

    if (!user) {
      console.log('signIn - user not found');
      return {
        success: false,
        errors: {
          _form: isDev
            ? [`아이디 '${result.data.username}'를 찾을 수 없습니다.`]
            : ['아이디 또는 비밀번호가 잘못되었습니다.'],
        },
      };
    }

    if (!user.password) {
      console.log('signIn - user has no password');
      return {
        success: false,
        errors: {
          _form: isDev
            ? ['사용자 계정에 비밀번호가 설정되지 않았습니다.']
            : ['로그인 정보가 올바르지 않습니다.'],
        },
      };
    }

    console.log('signIn - user found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      hasPassword: !!user.password,
    });

    const ok = await bcrypt.compare(result.data.password, user.password);
    console.log('signIn - password verification:', ok ? 'PASS' : 'FAIL');

    if (ok) {
      await makeLogin(user.id);
      console.log('signIn - login successful, redirecting to /admin');
      return { success: true, redirect: '/admin' };
    }

    // Password mismatch
    console.log('signIn - incorrect password');
    return {
      success: false,
      errors: {
        _form: isDev
          ? ['비밀번호가 일치하지 않습니다.']
          : ['아이디 또는 비밀번호가 잘못되었습니다.'],
      },
    };
  } catch (error) {
    console.error('signIn - error:', error);

    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      return {
        success: false,
        errors: { _form: [`로그인 실패: ${error.message}`] },
      };
    }

    return {
      success: false,
      errors: {
        _form: [
          '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        ],
      },
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
