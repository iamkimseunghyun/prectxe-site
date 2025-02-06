'use client';

import React, { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import AuthButton from '@/components/auth-button';
import { signUp } from '@/app/(auth)/signup/actions';
import { PASSWORD_MIN_LENGTH } from '@/app/(auth)/signup/validation';

const Page = () => {
  const [state, action] = useActionState(signUp, null);
  return (
    <div className="flex flex-col gap-10 px-6 py-8">
      <div className="flex flex-col gap-2 *:font-medium">
        <h1>안녕하세요!</h1>
        <h2>아래 정보를 입력하고 회원가입을 완료하세요!</h2>
      </div>
      <form action={action}>
        <div className="flex flex-col gap-2">
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
        <AuthButton text="관리자 등록" />
      </form>
    </div>
  );
};
export default Page;
