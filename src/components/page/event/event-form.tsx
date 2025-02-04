'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { eventFormSchema, type EventFormType } from '@/lib/validations/event';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

import { useRouter } from 'next/navigation';
import { FullEvent } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

import BasicInfoSection from '@/components/page/event/basic-info-section';
import DateVenueSection from '@/components/page/event/date-venue-section';
import OrganizersSection from '@/components/page/event/organizer-section';
import TicketsSection from '@/components/page/event/ticket-section';
import ImageUploadFormField from '@/components/page/event/image-upload-form-field';
import { formatDate } from '@/lib/utils';

interface EventFormProps {
  initialData?: FullEvent;
  venues: {
    id: string;
    name: string;
  }[];
  artists: {
    id: string;
    name: string;
  }[];
  onSubmitAction: (data: EventFormType) => Promise<{
    success: boolean;
    message: string | undefined;
    id?: string;
  }>;
}

export function EventForm({
  initialData,
  venues,
  artists,
  onSubmitAction,
}: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormType>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialData
      ? ({
          ...initialData,
          startDate: formatDate(new Date(initialData.startDate)),
          endDate: formatDate(new Date(initialData.endDate)),
        } as EventFormType)
      : {
          title: '',
          subtitle: '',
          description: '',
          type: 'exhibition',
          status: 'upcoming',
          startDate: formatDate(new Date()),
          endDate: formatDate(new Date()),
          price: 0,
          capacity: undefined,
          mainImageUrl: '',
          venueId: '',
          organizers: [],
          tickets: [],
        },
  });

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async () => {
            setIsSubmitting(true);
            try {
              const values = form.getValues();
              console.log('Form values:', values); // 폼 데이터 확인
              // 필수 필드 검증
              if (!values.mainImageUrl) {
                toast({
                  title: 'Error',
                  description: '이미지 URL을 입력해주세요.',
                });
                return;
              }
              if (!values.venueId) {
                toast({
                  title: 'Error',
                  description: '장소를 선택해주세요.',
                });
                return;
              }
              const result = await onSubmitAction(values);

              if (result.success) {
                toast({
                  title: 'Success',
                  description: result.message,
                });
                if (result.id) {
                  router.push(`/events/${result.id}`);
                } else {
                  router.push('/events');
                }
              } else {
                toast({
                  title: 'Error',
                  description: result.message,
                });
              }
            } catch (error) {
              toast({
                title: '이벤트 저장 중 오류가 발생했습니다.',
                description: 'Error',
              });
              console.error(error);
            } finally {
              setIsSubmitting(false);
            }
          })}
          className="space-y-8"
        >
          <div className="space-y-6">
            {/* 이미지 업로드 섹션 */}
            <ImageUploadFormField control={form.control} name="mainImageUrl" />
            {/* 기본 정보 섹션 */}
            <BasicInfoSection control={form.control} />

            {/* 일정 및 장소 섹션 */}
            <DateVenueSection control={form.control} venues={venues} />

            {/* 주최자 섹션 */}
            <OrganizersSection control={form.control} artists={artists} />

            {/* 티켓 섹션 */}
            <TicketsSection control={form.control} />

            {/* 제출 버튼 */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? '저장 중...'
                  : initialData
                    ? '수정하기'
                    : '등록하기'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
