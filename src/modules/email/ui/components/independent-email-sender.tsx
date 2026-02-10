'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send, Upload } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmailEditor, getEmailHTML } from '@/components/email-editor';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createAndSendEmailCampaign } from '../../server/actions';

const formSchema = z.object({
  title: z.string().min(1, '캠페인 제목을 입력해주세요'),
  subject: z.string().min(1, '이메일 제목을 입력해주세요'),
  body: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 10000자 이하여야 합니다'),
  template: z.enum(['form-notification', 'newsletter']),
  emails: z.string().min(1, '이메일을 입력해주세요'),
});

type FormValues = z.infer<typeof formSchema>;

interface IndependentEmailSenderProps {
  userId: string;
  isAdmin: boolean;
}

export function IndependentEmailSender({
  userId,
  isAdmin,
}: IndependentEmailSenderProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailCount, setEmailCount] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subject: '',
      body: '',
      template: 'form-notification',
      emails: '',
    },
  });

  // 이메일 개수 계산
  const handleEmailsChange = (value: string) => {
    const emails = value
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    setEmailCount(emails.length);
  };

  // CSV 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = text
        .split(/[\n,]/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));

      const currentEmails = form.getValues('emails');
      const newEmails = currentEmails
        ? `${currentEmails}\n${emails.join('\n')}`
        : emails.join('\n');

      form.setValue('emails', newEmails);
      handleEmailsChange(newEmails);

      toast({
        title: 'CSV 업로드 완료',
        description: `${emails.length}개의 이메일을 불러왔습니다`,
      });
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      // 이메일 파싱
      const emails = data.emails
        .split(/[\n,;]/)
        .map((e) => e.trim())
        .filter(Boolean);

      if (emails.length === 0) {
        throw new Error('유효한 이메일이 없습니다');
      }

      // Convert HTML to email-compatible format
      const emailHTML = getEmailHTML(data.body);

      // 이메일 발송
      const result = await createAndSendEmailCampaign({
        title: data.title,
        subject: data.subject,
        body: emailHTML,
        template: data.template,
        emails,
        userId,
      });

      if (result.success && result.data) {
        toast({
          title: '발송 완료',
          description: `${result.data.sentCount}건 발송 성공, ${result.data.failedCount}건 실패`,
        });
        form.reset();
        setEmailCount(0);
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>독립 발송</CardTitle>
        <CardDescription>
          이메일 주소를 직접 입력하거나 CSV 파일로 업로드하여 발송합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>캠페인 제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 2024 봄 뉴스레터" {...field} />
                  </FormControl>
                  <FormDescription>내부 관리용 제목입니다</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>템플릿 선택 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="form-notification">
                        알림 템플릿
                      </SelectItem>
                      <SelectItem value="newsletter">
                        뉴스레터 템플릿
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input placeholder="예: 행사 안내" {...field} />
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
                      placeholder="이메일 내용을 작성하세요. 이미지, YouTube 동영상 등을 추가할 수 있습니다."
                    />
                  </FormControl>
                  <FormDescription>
                    이미지, YouTube 동영상, 텍스트 서식 등을 지원합니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일 주소 목록 *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="이메일을 한 줄에 하나씩 입력하거나 쉼표로 구분하세요&#10;예:&#10;user1@example.com&#10;user2@example.com"
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleEmailsChange(e.target.value);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById('csv-upload')?.click()
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          CSV 업로드
                        </Button>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        {emailCount > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {emailCount}개의 이메일
                          </span>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    줄바꿈, 쉼표(,), 세미콜론(;)으로 구분 가능
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading || emailCount === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {emailCount > 0 ? `${emailCount}명에게 발송` : '발송하기'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
