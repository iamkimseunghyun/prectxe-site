import Link from 'next/link';
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SignUpFormSection from '@/modules/auth/ui/section/sign-up-form-section';

const SignUpView = () => {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white to-gray-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent)]" />

      <Card className="w-full max-w-md border-zinc-200/60">
        <CardHeader className="space-y-1 text-center">
          <Link
            href="/"
            className="mb-4 inline-block text-2xl font-bold tracking-tight"
          >
            PRECTXE
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">회원가입</h1>
          <p className="text-sm text-zinc-500">
            새 계정을 만들어 PRECTXE에 참여하세요
          </p>
        </CardHeader>
        <CardContent>
          <SignUpFormSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpView;
