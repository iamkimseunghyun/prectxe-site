'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, Upload, X } from 'lucide-react';
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
import { createAndSendSMSCampaign } from '../../server/actions';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  title: z.string().min(1, '캠페인 제목을 입력해주세요'),
  message: z
    .string()
    .min(1, '메시지를 입력해주세요')
    .max(2000, '메시지는 2000자 이하여야 합니다'),
  phones: z.string().min(1, '전화번호를 입력해주세요'),
});

type FormValues = z.infer<typeof formSchema>;

interface IndependentSenderProps {
  userId: string;
  isAdmin: boolean;
}

export function IndependentSender({ userId, isAdmin }: IndependentSenderProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneCount, setPhoneCount] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      message: '',
      phones: '',
    },
  });

  // 전화번호 개수 계산
  const handlePhonesChange = (value: string) => {
    const phones = value
      .split(/[\n,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    setPhoneCount(phones.length);
  };

  // CSV 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const phones = text
        .split(/[\n,]/)
        .map((p) => p.trim().replace(/[^0-9]/g, ''))
        .filter((p) => p.length >= 10);

      const currentPhones = form.getValues('phones');
      const newPhones = currentPhones
        ? `${currentPhones}\n${phones.join('\n')}`
        : phones.join('\n');

      form.setValue('phones', newPhones);
      handlePhonesChange(newPhones);

      toast({
        title: 'CSV 업로드 완료',
        description: `${phones.length}개의 전화번호를 불러왔습니다`,
      });
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      // 전화번호 파싱
      const phones = data.phones
        .split(/[\n,;]/)
        .map((p) => p.trim().replace(/[^0-9]/g, ''))
        .filter(Boolean);

      if (phones.length === 0) {
        throw new Error('유효한 전화번호가 없습니다');
      }

      // SMS 발송
      const result = await createAndSendSMSCampaign({
        title: data.title,
        message: data.message,
        phones,
        userId,
      });

      if (result.success && result.data) {
        toast({
          title: '발송 완료',
          description: `${result.data.sentCount}건 발송 성공, ${result.data.failedCount}건 실패`,
        });
        form.reset();
        setPhoneCount(0);
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
          전화번호를 직접 입력하거나 CSV 파일로 업로드하여 발송합니다
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
                    <Input
                      placeholder="예: 2024년 1월 이벤트 안내"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    발송 이력 관리를 위한 캠페인 제목입니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phones"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>전화번호 목록 *</FormLabel>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{phoneCount}개</Badge>
                      <label htmlFor="csv-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <span className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3" />
                            CSV 업로드
                          </span>
                        </Button>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            field.onChange('');
                            setPhoneCount(0);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="01012345678&#10;01087654321&#10;010-1111-2222"
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handlePhonesChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    전화번호를 한 줄에 하나씩 입력하거나, 쉼표/세미콜론으로 구분
                    <br />
                    하이픈은 자동으로 제거됩니다 (010-1234-5678 → 01012345678)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    현재: {field.value.length}자 ·{' '}
                    {phoneCount > 0 &&
                      `예상 비용: ${Math.ceil(phoneCount * (field.value.length > 90 ? 29 : 13))}원`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading || phoneCount === 0}
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
                  {phoneCount > 0 ? `${phoneCount}명에게 발송` : '발송하기'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
