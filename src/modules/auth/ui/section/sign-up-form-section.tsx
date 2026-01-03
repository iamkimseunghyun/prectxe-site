'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signUpSchema } from '@/lib/schemas';
import { signUp } from '@/modules/auth/server/actions';

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SignUpFormSection = () => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<SignUpFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirm_password: '',
    },
    resolver: zodResolver(signUpSchema),
  });

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: async (data) => {
      if (data.success && data.redirect) {
        router.push(data.redirect);
        toast({ title: '회원가입 성공', description: '로그인해주세요.' });
      } else if (data.errors) {
        // Handle _form errors - can be flattenedErrors object or { message: string }
        if (data.errors._form) {
          const formError = data.errors._form;
          const errorMessage =
            'message' in formError
              ? formError.message
              : formError.formErrors?.join(', ') || '오류가 발생했습니다.';
          form.setError('root.serverError', {
            message: errorMessage,
          });
        }
        // Handle field-level errors
        Object.entries(data.errors).forEach(([key, value]) => {
          if (key !== '_form' && Array.isArray(value) && value.length > 0) {
            form.setError(key as keyof SignUpFormValues, {
              message: value.join(', '),
            });
          }
        });
        // Get error message for toast
        const formError = data.errors._form;
        const toastMessage = formError
          ? 'message' in formError
            ? formError.message
            : formError.formErrors?.join(', ')
          : '입력 정보를 확인해주세요.';
        toast({
          title: '회원가입 실패',
          description: toastMessage,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Sign up mutation error:', error);
      form.setError('root.serverError', {
        message: '회원가입 중 오류가 발생했습니다.',
      });
      toast({
        title: '회원가입 오류',
        description: '서버 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = form.handleSubmit((data: SignUpFormValues) => {
    mutation.mutate(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
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
                  placeholder="사용자 이름을 입력하세요"
                  className="h-11"
                />
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
                <Input
                  type="email"
                  {...field}
                  placeholder="이메일을 입력하세요"
                  className="h-11"
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
                  placeholder="비밀번호를 입력하세요"
                  className="h-11"
                />
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
                  placeholder="비밀번호를 다시 입력하세요"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="mt-2 h-11 w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              가입 중...
            </>
          ) : (
            '회원가입'
          )}
        </Button>

        <div className="text-center text-sm text-zinc-500">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/auth/signin"
            className="font-medium text-zinc-900 hover:underline"
          >
            로그인
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default SignUpFormSection;
