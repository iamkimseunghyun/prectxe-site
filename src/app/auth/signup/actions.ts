'use server';

import { signUpFormSchema } from '@/app/auth/signup/validation';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db/prisma';
import makeLogin from '@/lib/make-login';
import { redirect } from 'next/navigation';

type FormState = {
  fieldErrors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirm_password?: string[];
  };
  formErrors?: string[];
};

export async function signUpTest(
  prevState: FormState | null,
  formData: FormData
) {
  try {
    // 1. 입력 데이터 확인
    const data = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirm_password: formData.get('confirm_password') as string,
    };
    console.log('1. Received form data:', {
      ...data,
      password: '[HIDDEN]',
      confirm_password: '[HIDDEN]',
    });

    // 2. 기본 데이터 유효성 검사
    if (
      !data.username ||
      !data.email ||
      !data.password ||
      !data.confirm_password
    ) {
      console.log('2. Missing required fields');
      return {
        fieldErrors: {
          username: !data.username ? ['Username is required'] : undefined,
          email: !data.email ? ['Email is required'] : undefined,
          password: !data.password ? ['Password is required'] : undefined,
          confirm_password: !data.confirm_password
            ? ['Password confirmation is required']
            : undefined,
        },
      };
    }

    // 3. Zod 검증
    console.log('3. Starting Zod validation');
    const result = await signUpFormSchema.safeParseAsync(data);
    if (!result.success) {
      console.log('3. Zod validation failed:', result.error.flatten());
      return result.error.flatten();
    }
    console.log('3. Zod validation passed');

    // 4. 비밀번호 해싱
    console.log('4. Starting password hashing');
    const hashedPassword = await bcrypt.hash(data.password, 12);
    console.log('4. Password hashed successfully');

    // 5. 사용자 생성 시도
    console.log('5. Attempting to create user');
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
    console.log('5. User created successfully:', user.id);

    // 6. 세션 생성
    console.log('6. Starting session creation');
    await makeLogin(user.id);
    console.log('6. Session created successfully');

    console.log('7. Redirecting to admin page');
    // 리다이렉션 전에 성공 상태 반환
    return { success: true, redirectTo: '/admin' };
  } catch (error) {
    console.error('Signup error:', {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      formErrors: ['회원가입 중 오류가 발생했습니다.'],
    };
  }
}

export async function signUp(prevState: FormState | null, formData: FormData) {
  const data = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
  };

  const result = await signUpFormSchema.safeParseAsync(data);

  if (!result.success) {
    console.log(result.error);
    return result.error.flatten();
  } else {
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

    await makeLogin(user.id);
    return redirect('/profile');
  }
}
