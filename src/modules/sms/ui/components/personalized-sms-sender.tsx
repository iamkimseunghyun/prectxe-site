'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { sendPersonalizedSMS } from '@/modules/sms/server/actions';
import { normalizePhoneNumber, validatePhoneNumber } from '@/lib/sms/utils';

const formSchema = z.object({
  title: z.string().min(1, '캠페인 제목을 입력하세요'),
  phoneList: z.string().min(1, '전화번호를 입력하세요'),
  nameList: z.string(), // 선택적
  valueList: z.string(), // 선택적
  template: z.string().min(1, '메시지 템플릿을 입력하세요'),
});

type FormValues = z.infer<typeof formSchema>;

interface Recipient {
  phone: string;
  name?: string;
  value?: string;
  message: string;
}

export function PersonalizedSMSSender({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      phoneList: '',
      nameList: '',
      valueList: '',
      template: '안녕하세요 {name}님,\n{value}\n\n감사합니다.',
    },
  });

  // 실시간 데이터 파싱 및 검증
  const parsedData = useMemo(() => {
    const phoneList = form.watch('phoneList');
    const nameList = form.watch('nameList');
    const valueList = form.watch('valueList');
    const template = form.watch('template');

    const phones = phoneList
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const names = nameList.split('\n').map((l) => l.trim()); // 빈 줄도 유지
    const values = valueList.split('\n').map((l) => l.trim()); // 빈 줄도 유지

    const phoneCount = phones.length;
    const isValid = phoneCount > 0;

    // 전화번호 검증
    const validPhones = phones.filter((phone) => {
      const normalized = normalizePhoneNumber(phone);
      return validatePhoneNumber(normalized);
    });
    const invalidPhoneCount = phoneCount - validPhones.length;

    // 미리보기 데이터 생성
    const recipients: Recipient[] = phones.slice(0, 5).map((phone, index) => {
      const name = names[index] || '';
      const value = values[index] || '';

      // 메시지 변수 치환
      let message = template;
      if (name) {
        message = message.replace(/{name}/g, name);
      } else {
        message = message.replace(/{name}님,?\s*/g, '').replace(/{name}/g, '');
      }
      if (value) {
        message = message.replace(/{value}/g, value);
      } else {
        message = message.replace(/{value}\s*/g, '').replace(/{value}/g, '');
      }

      return {
        phone: normalizePhoneNumber(phone),
        name,
        value,
        message,
      };
    });

    return {
      phoneCount,
      isValid,
      invalidPhoneCount,
      recipients,
      hasMoreRecipients: phoneCount > 5,
    };
  }, [
    form.watch('phoneList'),
    form.watch('nameList'),
    form.watch('valueList'),
    form.watch('template'),
  ]);

  async function onSubmit(data: FormValues) {
    if (!parsedData.isValid) {
      toast({
        title: '입력 오류',
        description: '전화번호를 입력하세요',
        variant: 'destructive',
      });
      return;
    }

    if (parsedData.invalidPhoneCount > 0) {
      toast({
        title: '전화번호 오류',
        description: `${parsedData.invalidPhoneCount}개의 유효하지 않은 전화번호가 있습니다`,
        variant: 'destructive',
      });
      return;
    }

    const phones = data.phoneList
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const names = data.nameList.split('\n').map((l) => l.trim());
    const values = data.valueList.split('\n').map((l) => l.trim());

    const recipients = phones.map((phone, index) => ({
      phone: normalizePhoneNumber(phone),
      name: names[index] || undefined,
      value: values[index] || undefined,
    }));

    setIsSubmitting(true);

    try {
      const result = await sendPersonalizedSMS({
        recipients,
        template: data.template,
        title: data.title,
        userId,
      });

      if (result.success) {
        toast({
          title: '발송 완료',
          description: `${result.data?.sentCount}명에게 발송 완료 (실패: ${result.data?.failedCount})`,
        });
        form.reset();
      } else {
        toast({
          title: '발송 실패',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description:
          error instanceof Error ? error.message : '발송에 실패했습니다',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 캠페인 제목 */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>캠페인 제목 *</FormLabel>
              <FormControl>
                <Input placeholder="예: 50% 할인 쿠폰 발송" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3-column 입력 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 전화번호 */}
          <FormField
            control={form.control}
            name="phoneList"
            render={({ field }) => (
              <FormItem>
                <FormLabel>전화번호 *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="010-1234-5678&#10;010-8765-4321&#10;..."
                    rows={10}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {parsedData.phoneCount}개
                  {parsedData.invalidPhoneCount > 0 && (
                    <span className="text-destructive">
                      {' '}
                      (유효하지 않음: {parsedData.invalidPhoneCount}개)
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 이름 */}
          <FormField
            control={form.control}
            name="nameList"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 (선택)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="홍길동&#10;김철수&#10;..."
                    rows={10}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>비어있어도 됩니다</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 개별 내용 */}
          <FormField
            control={form.control}
            name="valueList"
            render={({ field }) => (
              <FormItem>
                <FormLabel>개별 내용 (선택)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="쿠폰: ICD71991&#10;예약번호: R12345&#10;..."
                    rows={10}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>쿠폰, 예약번호 등 개별 내용</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 검증 상태 */}
        <Alert variant={parsedData.isValid ? 'default' : 'destructive'}>
          <AlertDescription>
            {parsedData.isValid
              ? `✅ ${parsedData.phoneCount}명에게 개별 발송 준비 완료`
              : `⚠️ 전화번호를 입력하세요`}
          </AlertDescription>
        </Alert>

        {/* 메시지 템플릿 */}
        <FormField
          control={form.control}
          name="template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메시지 템플릿 *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="안녕하세요 {name}님,&#10;{value}&#10;감사합니다."
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                변수: <code>{'{name}'}</code> (이름), <code>{'{value}'}</code>{' '}
                (개별 내용) - 없으면 자동 제거됨
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 미리보기 */}
        {parsedData.isValid && parsedData.recipients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>미리보기</CardTitle>
              <CardDescription>
                처음 5개 메시지 미리보기
                {parsedData.hasMoreRecipients &&
                  ` (+ ${parsedData.phoneCount - 5}개 더)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>전화번호</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>개별 내용</TableHead>
                    <TableHead>메시지</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.recipients.map((recipient, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRecipient(recipient)}
                    >
                      <TableCell className="font-mono text-sm">
                        {recipient.phone}
                      </TableCell>
                      <TableCell>
                        {recipient.name || (
                          <span className="text-muted-foreground">없음</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {recipient.value || (
                          <span className="text-muted-foreground">없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {recipient.message}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 발송 버튼 */}
        <Button
          type="submit"
          disabled={isSubmitting || !parsedData.isValid}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              발송 중...
            </>
          ) : (
            `${parsedData.phoneCount}명에게 개별 발송`
          )}
        </Button>
      </form>

      {/* 미리보기 상세 모달 */}
      <Dialog
        open={!!selectedRecipient}
        onOpenChange={(open) => !open && setSelectedRecipient(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>메시지 미리보기</DialogTitle>
            <DialogDescription>발송될 메시지 전체 내용입니다</DialogDescription>
          </DialogHeader>

          {selectedRecipient && (
            <div className="space-y-4">
              {/* 수신자 정보 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    전화번호:
                  </span>
                  <span className="font-mono text-sm">
                    {selectedRecipient.phone}
                  </span>
                </div>

                {selectedRecipient.name && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      이름:
                    </span>
                    <span className="text-sm">{selectedRecipient.name}</span>
                  </div>
                )}

                {selectedRecipient.value && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      개별 내용:
                    </span>
                    <span className="font-mono text-sm">
                      {selectedRecipient.value}
                    </span>
                  </div>
                )}
              </div>

              {/* 메시지 내용 */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  발송 메시지
                </p>
                <div className="whitespace-pre-wrap text-sm">
                  {selectedRecipient.message}
                </div>
              </div>

              {/* 글자 수 */}
              <div className="text-xs text-muted-foreground text-right">
                {selectedRecipient.message.length}자 (
                {selectedRecipient.message.length > 90 ? 'LMS' : 'SMS'})
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Form>
  );
}
