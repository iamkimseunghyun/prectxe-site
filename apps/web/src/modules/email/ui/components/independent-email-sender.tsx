'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { stripHtml } from '@/lib/utils';
import {
  EmailEditor,
  getEmailHTML,
} from '@/modules/email/ui/components/email-editor';
import { createAndSendEmailCampaign } from '../../server/actions';
import { useEmailDraft } from '../hooks/use-email-draft';
import { DraftRestoredNotice } from './draft-restored-notice';
import { SendControls } from './send-controls';

const formSchema = z.object({
  title: z.string().min(1, '캠페인 제목을 입력해주세요'),
  subject: z.string().min(1, '이메일 제목을 입력해주세요'),
  body: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 10000자 이하여야 합니다'),
  emails: z.string().min(1, '이메일을 입력해주세요'),
});

type FormValues = z.infer<typeof formSchema>;

/** 줄바꿈·쉼표·세미콜론으로 구분된 주소 목록을 배열로. */
function parseEmailList(value: string): string[] {
  return value
    .split(/[\n,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function IndependentEmailSender() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailCount, setEmailCount] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subject: '',
      body: '',
      emails: '',
    },
  });

  const { restored, editorKey, reset } = useEmailDraft<FormValues>(
    'independent',
    form,
    (v) => !(v.title || v.subject || v.emails || stripHtml(v.body))
  );

  // 초안을 불러오면 수신자 수 표시도 같이 맞춰준다.
  // handleEmailsChange를 부르지 않는 이유: 매 렌더 새 참조라 deps에 넣으면
  // effect가 매번 재실행된다(CLAUDE.md의 무한 루프 함정).
  useEffect(() => {
    if (restored)
      setEmailCount(parseEmailList(form.getValues('emails')).length);
  }, [restored, form]);

  // 이메일 개수 계산
  const handleEmailsChange = (value: string) => {
    setEmailCount(parseEmailList(value).length);
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

      const emails = parseEmailList(data.emails);

      if (emails.length === 0) {
        throw new Error('유효한 이메일이 없습니다');
      }

      // Convert HTML to email-compatible format
      const emailHTML = getEmailHTML(data.body);

      // 이메일 발송
      const result = await createAndSendEmailCampaign({
        source: 'manual',
        title: data.title,
        subject: data.subject,
        body: emailHTML,
        emails,
      });

      if (result.success && result.data) {
        toast({
          title: '발송 완료',
          description: `${result.data.sentCount}건 발송 성공, ${result.data.failedCount}건 실패`,
        });
        reset();
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
        <CardTitle>주소 직접 입력 발송</CardTitle>
        <CardDescription>
          이메일 주소를 직접 입력하거나 CSV 파일로 업로드하여 발송합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {restored && <DraftRestoredNotice onDiscard={reset} />}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>캠페인 제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 2026 봄 프로그램 안내" {...field} />
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
                      key={editorKey}
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

            <SendControls
              recipientCount={emailCount}
              isSending={isLoading}
              onConfirm={() => form.handleSubmit(onSubmit)()}
              validate={() => form.trigger()}
              getTestPayload={() => ({
                subject: form.getValues('subject'),
                body: getEmailHTML(form.getValues('body')),
              })}
              targetLabel={`직접 입력한 ${emailCount}명`}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
