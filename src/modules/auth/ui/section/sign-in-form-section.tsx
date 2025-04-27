'use client';

import React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { signInSchema } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/modules/auth/server/actions';

const SignInFormSection = () => {
  const form = useForm<z.infer<typeof signInSchema>>({
    defaultValues: {
      username: '',
      password: '',
    },
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof signInSchema>) => {
      try {
        const result = await signIn(data);

        if (result && !result.success && result.errors) {
          const serverErrors = result.errors;

          // 필드별 에러 설정
          Object.entries(serverErrors).forEach(([key, value]) => {
            if (key !== '_form' && value) {
              form.setError(key as keyof z.infer<typeof signInSchema>, {
                type: 'server',
                message: value.join(', '),
              });
            }
          });
        }
      } catch (error) {
        console.error('Unexpected error during sign in:', error);
      }
    }
  );
  return (
    <div className="flex items-center justify-center">
      <Form {...form}>
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-xl flex-col gap-3"
        >
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사용자 이름</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      {...field}
                      placeholder="사용자 이름을 입력하세요."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder="비밀번호를 입력하세요."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-x-4">
            <button
              type="submit"
              className="rounded-lg bg-rose-400 p-4 text-white hover:bg-rose-300"
            >
              로그인
            </button>

            <span className="rounded-lg bg-teal-500 p-4 text-white hover:bg-teal-400">
              <a href="/auth/signup">회원 가입</a>
            </span>
          </div>
        </form>
      </Form>
    </div>
  );
};
export default SignInFormSection;
