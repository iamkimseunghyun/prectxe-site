'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Send, Users } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createAndSendEmailCampaign,
  getFormRespondentsEmails,
  getFormsWithEmailFields,
} from '../../server/actions';

const formSchema = z.object({
  formId: z.string().min(1, 'Form을 선택해주세요'),
  subject: z.string().min(1, '제목을 입력해주세요'),
  body: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 10000자 이하여야 합니다'),
  template: z.enum(['form-notification', 'newsletter']),
});

type FormValues = z.infer<typeof formSchema>;

interface FormRecipientsEmailSenderProps {
  userId: string;
  isAdmin: boolean;
}

export function FormRecipientsEmailSender({
  userId,
  isAdmin,
}: FormRecipientsEmailSenderProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      emailFieldCount: number;
      submissionCount: number;
    }>
  >([]);
  const [selectedFormInfo, setSelectedFormInfo] = useState<{
    validEmailCount: number;
    totalSubmissions: number;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      formId: '',
      subject: '',
      body: '',
      template: 'form-notification',
    },
  });

  // Form 목록 로드
  useEffect(() => {
    async function loadForms() {
      const result = await getFormsWithEmailFields(userId, isAdmin);
      if (result.success && result.data) {
        setForms(result.data);
      }
    }
    loadForms();
  }, [userId, isAdmin]);

  // Form 선택 시 응답자 수 확인
  const handleFormChange = async (formId: string) => {
    setSelectedFormInfo(null);
    if (!formId) return;

    const result = await getFormRespondentsEmails(formId);
    if (result.success && result.data) {
      setSelectedFormInfo({
        validEmailCount: result.data.validEmailCount,
        totalSubmissions: result.data.totalSubmissions,
      });
    } else {
      toast({
        title: '오류',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      // 이메일 목록 가져오기
      const emailResult = await getFormRespondentsEmails(data.formId);
      if (!emailResult.success || !emailResult.data) {
        throw new Error(emailResult.error);
      }

      const selectedForm = forms.find((f) => f.id === data.formId);
      const title = `${selectedForm?.title || 'Form'} 응답자 발송`;

      // 이메일 발송
      const result = await createAndSendEmailCampaign({
        title,
        subject: data.subject,
        body: data.body,
        template: data.template,
        emails: emailResult.data.emails,
        formId: data.formId,
        userId,
      });

      if (result.success && result.data) {
        toast({
          title: '발송 완료',
          description: `${result.data.sentCount}건 발송 성공, ${result.data.failedCount}건 실패`,
        });
        form.reset();
        setSelectedFormInfo(null);
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
        <CardTitle>Form 응답자에게 발송</CardTitle>
        <CardDescription>
          Form 제출자의 이메일 주소로 단체 메일을 발송합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="formId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form 선택 *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFormChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="이메일 필드가 있는 Form을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {forms.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          이메일 필드가 있는 Form이 없습니다
                        </div>
                      ) : (
                        forms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.title} ({f.submissionCount}명 제출)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    이메일 필드가 포함된 Form만 표시됩니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFormInfo && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    발송 대상: {selectedFormInfo.validEmailCount}명
                  </span>
                  <span className="text-muted-foreground">
                    (총 {selectedFormInfo.totalSubmissions}명 제출)
                  </span>
                </div>
              </div>
            )}

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
                        <div>
                          <div className="font-medium">알림 템플릿</div>
                          <div className="text-xs text-muted-foreground">
                            Form 응답자에게 간단한 알림 전달
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="newsletter">
                        <div>
                          <div className="font-medium">뉴스레터 템플릿</div>
                          <div className="text-xs text-muted-foreground">
                            CTA 버튼이 포함된 홍보용 메일
                          </div>
                        </div>
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
                    <Textarea
                      placeholder="발송할 메시지를 입력하세요"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    현재: {field.value.length}자 / 10,000자
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading || !selectedFormInfo}
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
                  {selectedFormInfo
                    ? `${selectedFormInfo.validEmailCount}명에게 발송`
                    : '발송하기'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
