'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  EmailEditor,
  getEmailHTML,
} from '@/modules/email/ui/components/email-editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createAndSendNewsletterBroadcast } from '../../server/actions';

const formSchema = z.object({
  title: z.string().min(1, '캠페인 제목을 입력해주세요'),
  subject: z.string().min(1, '이메일 제목을 입력해주세요'),
  body: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(50000, '내용은 50000자 이하여야 합니다'),
});

type FormValues = z.infer<typeof formSchema>;

export function NewsletterBroadcastSender() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', subject: '', body: '' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const emailHTML = getEmailHTML(data.body);

      const result = await createAndSendNewsletterBroadcast({
        title: data.title,
        subject: data.subject,
        body: emailHTML,
      });

      if (result.success) {
        toast({
          title: '발송 요청 완료',
          description: 'Resend 브로드캐스트가 발송 대기열에 등록됐습니다.',
        });
        form.reset();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '발송 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>뉴스레터 브로드캐스트</CardTitle>
        <CardDescription>
          Resend의 뉴스레터 세그먼트에 속한 모든 구독자에게 즉시 발송합니다.
          수신자 목록은 Resend가 관리하며, 수신 거부 링크는 자동 삽입됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(() => setConfirmOpen(true))(e);
            }}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>캠페인 제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 2026 봄 뉴스레터" {...field} />
                  </FormControl>
                  <FormDescription>내부 관리용 제목입니다</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일 제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 이번 달 프로그램 안내" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일 내용 *</FormLabel>
                  <FormControl>
                    <EmailEditor
                      content={field.value}
                      onChange={(html) => field.onChange(html)}
                      placeholder="이메일 내용을 작성하세요."
                    />
                  </FormControl>
                  <FormDescription>
                    이미지·링크·YouTube 삽입 가능. 푸터에 수신 거부 링크가 자동
                    추가됩니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    <>
                      <Megaphone className="mr-2 h-4 w-4" />
                      구독자 전체에게 발송
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>뉴스레터 발송 확인</AlertDialogTitle>
                  <AlertDialogDescription>
                    Resend의 뉴스레터 세그먼트에 등록된 모든 구독자에게 즉시
                    발송됩니다. 이 작업은 취소할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>
                    취소
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    발송
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
