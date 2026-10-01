'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { stripHtml } from '@/lib/utils';
import {
  EmailEditor,
  getEmailHTML,
} from '@/modules/email/ui/components/email-editor';
import {
  createAndSendEmailCampaign,
  getFormRespondentsSummary,
  getFormsWithEmailFields,
} from '../../server/actions';
import { useEmailDraft } from '../hooks/use-email-draft';
import { DraftRestoredNotice } from './draft-restored-notice';
import { SendControls } from './send-controls';

const formSchema = z.object({
  formId: z.string().min(1, 'Form을 선택해주세요'),
  subject: z.string().min(1, '제목을 입력해주세요'),
  body: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 10000자 이하여야 합니다'),
});

type FormValues = z.infer<typeof formSchema>;

export function FormRecipientsEmailSender() {
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
    },
  });

  const { restored, editorKey, reset } = useEmailDraft<FormValues>(
    'form-recipients',
    form,
    (v) => !(v.formId || v.subject || stripHtml(v.body))
  );

  // handleFormChange는 매 렌더 새 참조라 effect deps에 직접 넣으면 무한 루프가
  // 난다(CLAUDE.md). ref로 최신 함수만 들고 간다.
  const handleFormChangeRef = useRef<(formId: string) => Promise<void>>(
    async () => {}
  );

  // 초안에 폼이 선택돼 있었다면 수신자 수도 다시 조회한다
  useEffect(() => {
    if (!restored) return;
    const formId = form.getValues('formId');
    if (formId) void handleFormChangeRef.current(formId);
  }, [restored, form]);

  // Form 목록 로드
  useEffect(() => {
    async function loadForms() {
      const result = await getFormsWithEmailFields();
      if (result.success && result.data) {
        setForms(result.data);
      }
    }
    loadForms();
  }, []);

  // Form 선택 시 응답자 수 확인
  const handleFormChange = async (formId: string) => {
    setSelectedFormInfo(null);
    if (!formId) return;

    const result = await getFormRespondentsSummary(formId);
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
  handleFormChangeRef.current = handleFormChange;

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      const selectedForm = forms.find((f) => f.id === data.formId);
      const title = `${selectedForm?.title || 'Form'} 응답자 발송`;

      // Convert HTML to email-compatible format
      const emailHTML = getEmailHTML(data.body);

      // 수신자 주소는 서버가 formId로 직접 조회한다 — 여기서 보내지 않는다.
      const result = await createAndSendEmailCampaign({
        source: 'form',
        formId: data.formId,
        title,
        subject: data.subject,
        body: emailHTML,
      });

      if (result.success && result.data) {
        toast({
          title: '발송 완료',
          description: `${result.data.sentCount}건 발송 성공, ${result.data.failedCount}건 실패`,
        });
        reset();
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
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {restored && <DraftRestoredNotice onDiscard={reset} />}

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

            <SendControls
              recipientCount={selectedFormInfo?.validEmailCount ?? 0}
              isSending={isLoading}
              onConfirm={() => form.handleSubmit(onSubmit)()}
              validate={() => form.trigger()}
              getTestPayload={() => ({
                subject: form.getValues('subject'),
                body: getEmailHTML(form.getValues('body')),
              })}
              targetLabel={`폼 응답자 ${selectedFormInfo?.validEmailCount ?? 0}명`}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
