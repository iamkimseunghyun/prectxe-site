import React from 'react';
import SignUpFormSection from '@/modules/auth/ui/section/sign-up-form-section';

const SignUpView = () => {
  return (
    <div className="flex h-screen flex-col justify-start gap-10 px-6 py-8 pt-20">
      <div className="flex flex-col gap-2 text-center *:font-medium">
        <h1 className="text-2xl">안녕하세요!</h1>
        <h2 className="text-xl">아래 정보를 입력하고 회원가입을 완료하세요!</h2>
      </div>
      <SignUpFormSection />
    </div>
  );
};
export default SignUpView;
