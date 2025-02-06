'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import LoginButton from '@/components/auth-button';
import { signIn } from '@/app/(auth)/signin/actions';

const Page = () => {
  const [state, action, isPending] = useActionState(signIn, null);

  return (
    <div className="flex flex-col gap-10 px-6 py-8">
      <div className="flex flex-col gap-2 *:font-medium">
        <h1 className="text-2xl">안녕하세요!</h1>
        <h2 className="text-xl">Log in with email and password.</h2>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
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
            placeholder="Password"
            required
          />
          {state?.fieldErrors ? state?.fieldErrors?.password : ''}
        </div>
        <LoginButton text="Login" isPending={isPending} />
      </form>
    </div>
  );
};

export default Page;
