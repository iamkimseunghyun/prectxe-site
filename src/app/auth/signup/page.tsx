'use client';

import React, { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { signUp } from '@/app/auth/signup/actions';
import { PASSWORD_MIN_LENGTH } from '@/app/auth/signup/validation';
import Link from 'next/link';

const Page = () => {
  const [state, action] = useActionState(signUp, null);
  return (
    <div className="flex h-screen flex-col justify-center gap-10 px-6 py-8">
      <div className="flex flex-col gap-2 text-center *:font-medium">
        <h1>안녕하세요!</h1>
        <h2>아래 정보를 입력하고 회원가입을 완료하세요!</h2>
      </div>
      <div className="flex items-center justify-center">
        <form action={action} className="w-full max-w-xl space-y-6">
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              name="username"
              placeholder="Username"
              required
              minLength={3}
            />
            {state?.fieldErrors.username}
            <Input
              type="email"
              name="email"
              placeholder="Email"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            {state?.fieldErrors.email}
            <Input
              type="password"
              name="password"
              placeholder="Password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            {state?.fieldErrors.password}
            <Input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              required
            />
            {state?.fieldErrors.confirm_password}
          </div>

          <div className="flex gap-x-4">
            <Link href="/auth/signin">
              <span className="rounded-lg bg-rose-400 p-4 text-white hover:bg-rose-300">
                관리자 등록
              </span>
            </Link>
            <Link href="/auth/signin">
              <span className="rounded-lg bg-teal-500 p-4 text-white hover:bg-teal-400">
                관리자 로그인
              </span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Page;
