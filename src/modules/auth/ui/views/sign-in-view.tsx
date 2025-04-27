import React from 'react';
import SignInFormSection from '@/modules/auth/ui/section/sign-in-form-section';

const SignInView = () => {
  return (
    <div className="flex h-screen flex-col justify-start gap-10 px-6 py-8 pt-20">
      <div className="flex flex-col gap-2 text-center *:font-medium">
        <h1 className="text-2xl">안녕하세요!</h1>
        <h2 className="text-xl">아이디와 패스워드를 입력하고 로그인하세요.</h2>
      </div>
      <SignInFormSection />
    </div>
  );
};
export default SignInView;
