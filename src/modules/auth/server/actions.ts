'use server';

import { prisma } from '@/lib/db/prisma';

import { makeLogin } from '@/lib/auth/make-login';
import { z } from 'zod';
import { signInSchema, signUpSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';

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
    const user = await prisma.user.findUnique({
      where: {
        username: result.data.username,
      },
      select: { id: true, password: true },
    });

    // 사용자 없거나 비밀번호 없으면 실패 처리
    if (!user || !user.password) {
      return {
        success: false,
        errors: { _form: ['사용자 이름 또는 비밀번호가 잘못되었습니다.'] },
      };
    }

    // const ok = await Bun.password.verify(result.data.password, user.password);
    const ok = await bcrypt.compare(result.data.password, user.password);
    if (ok) {
      await makeLogin(user!.id);
      return { success: true, redirect: '/profile' };
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
