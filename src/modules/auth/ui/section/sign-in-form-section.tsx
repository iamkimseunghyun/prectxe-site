'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { signInSchema } from '@/lib/schemas';
import { signIn } from '@/modules/auth/server/actions';

type SignInFormValues = z.infer<typeof signInSchema>;

const SignInFormSection = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof signInSchema>>({
    defaultValues: {
      username: '',
      password: '',
    },
    resolver: zodResolver(signInSchema),
  });

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async (data) => {
      if (data.success && data.redirect) {
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        router.push(data.redirect);
        toast({ title: '로그인 성공' });
      } else if (data.errors) {
        if (data.errors._form) {
          form.setError('root.serverError', {
            message: data.errors._form.join(', '),
          });
        }
        Object.entries(data.errors).forEach(([key, value]) => {
          if (key !== '_form' && value) {
            form.setError(key as keyof SignInFormValues, {
              message: value.join(', '),
            });
          }
        });
        toast({
          title: '로그인 실패',
          description:
            data.errors._form?.join(', ') || '입력 정보를 확인해주세요.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Sign in mutation error:', error);
      form.setError('root.serverError', {
        message: '로그인 중 오류가 발생했습니다.',
      });
      toast({
        title: '로그인 오류',
        description: '서버 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = form.handleSubmit((data: z.infer<typeof signInSchema>) => {
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

        <Button
          type="submit"
          className="mt-2 h-11 w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </Button>

        <div className="text-center text-sm text-zinc-500">
          계정이 없으신가요?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-zinc-900 hover:underline"
          >
            회원가입
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default SignInFormSection;
