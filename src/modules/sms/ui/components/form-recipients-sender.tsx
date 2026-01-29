'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Users, Send } from 'lucide-react';
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
  getFormsWithPhoneFields,
  getFormRespondentsPhones,
  createAndSendSMSCampaign,
} from '../../server/actions';

const formSchema = z.object({
  formId: z.string().min(1, 'Form을 선택해주세요'),
  message: z
    .string()
    .min(1, '메시지를 입력해주세요')
    .max(2000, '메시지는 2000자 이하여야 합니다'),
});

type FormValues = z.infer<typeof formSchema>;

interface FormRecipientsSenderProps {
  userId: string;
  isAdmin: boolean;
}

export function FormRecipientsSender({
  userId,
  isAdmin,
}: FormRecipientsSenderProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      phoneFieldCount: number;
      submissionCount: number;
    }>
  >([]);
  const [selectedFormInfo, setSelectedFormInfo] = useState<{
    validPhoneCount: number;
    totalSubmissions: number;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      formId: '',
      message: '',
    },
  });

  // Form 목록 로드
  useEffect(() => {
    async function loadForms() {
      const result = await getFormsWithPhoneFields(userId, isAdmin);
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

    const result = await getFormRespondentsPhones(formId);
    if (result.success && result.data) {
      setSelectedFormInfo({
        validPhoneCount: result.data.validPhoneCount,
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

      // 전화번호 목록 가져오기
      const phoneResult = await getFormRespondentsPhones(data.formId);
      if (!phoneResult.success || !phoneResult.data) {
        throw new Error(phoneResult.error);
      }

      const selectedForm = forms.find((f) => f.id === data.formId);
      const title = `${selectedForm?.title || 'Form'} 응답자 발송`;

      // SMS 발송
      const result = await createAndSendSMSCampaign({
        title,
        message: data.message,
        phones: phoneResult.data.phones,
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
        description:
          error instanceof Error ? error.message : '알 수 없는 오류',
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
          Form 제출자의 전화번호로 단체 문자를 발송합니다
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
                        <SelectValue placeholder="전화번호 필드가 있는 Form을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {forms.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          전화번호 필드가 있는 Form이 없습니다
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
                    전화번호 필드가 포함된 Form만 표시됩니다
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
                    발송 대상: {selectedFormInfo.validPhoneCount}명
                  </span>
                  <span className="text-muted-foreground">
                    (총 {selectedFormInfo.totalSubmissions}명 제출)
                  </span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메시지 내용 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="발송할 메시지를 입력하세요"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    90자 이하: SMS (13원), 90자 초과: LMS (29원)
                    <br />
                    현재: {field.value.length}자
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
                    ? `${selectedFormInfo.validPhoneCount}명에게 발송`
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
