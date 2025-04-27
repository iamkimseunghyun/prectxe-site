'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { signUpSchema } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@/modules/auth/server/actions';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const SignUpFormSection = () => {
  const form = useForm<z.infer<typeof signUpSchema>>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirm_password: '',
    },
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof signUpSchema>) => {
      await signUp(data);
    }
  );
  return (
    <div className="flex items-center justify-center">
      <Form {...form}>
        <form onSubmit={onSubmit} className="w-full max-w-xl space-y-6">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사용자 이름</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} placeholder="Username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="Email" />
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
                    <Input type="password" {...field} placeholder="Password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder="Password confirm"
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
              회원 가입
            </button>

            <span className="rounded-lg bg-teal-500 p-4 text-white hover:bg-teal-400">
              <a href="/auth/signin">로그인</a>
            </span>
          </div>
        </form>
      </Form>
    </div>
  );
};
export default SignUpFormSection;
