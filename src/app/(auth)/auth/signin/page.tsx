'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { signIn } from '@/app/(auth)/auth/signin/actions';
import { Button } from '@/components/ui/button';

const Page = () => {
  const [state, action, isPending] = useActionState(signIn, null);

  return (
    <div className="flex h-screen flex-col justify-start gap-10 px-6 py-8 pt-20">
      <div className="flex flex-col gap-2 text-center *:font-medium">
        <h1 className="text-2xl">안녕하세요!</h1>
        <h2 className="text-xl">아이디와 패스워드를 입력하고 로그인하세요.</h2>
      </div>
      <div className="flex items-center justify-center">
        <form action={action} className="flex w-full max-w-xl flex-col gap-3">
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              name="username"
              placeholder="사용자 이름을 입력하세요."
              required
            />
            {state?.fieldErrors && state.fieldErrors.username}
            <Input
              type="password"
              name="password"
              placeholder="비밀번호를 입력하세요"
              required
            />
            {state?.fieldErrors ? state?.fieldErrors?.password : ''}
          </div>
          <Button disabled={isPending}>
            {isPending ? '로딩 중...' : '로그인'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Page;
