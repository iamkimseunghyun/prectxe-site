'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

import BasicInfoSection from '@/components/page/event/basic-info-section';
import DateVenueSection from '@/components/page/event/date-venue-section';
import OrganizersSection from '@/components/page/event/organizer-section';
import TicketsSection from '@/components/page/event/ticket-section';
import { formatDateForForm, uploadImage } from '@/lib/utils';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import SingleImageBox from '@/components/image/single-image-box';
import { createEvent, updateEvent } from '@/app/(page)/events/actions';
import { Event, eventSchema, EventStatus, EventType } from '@/lib/schemas';

interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: Event;
  venues: {
    id: string;
    name: string;
  }[];
  artists: {
    id: string;
    name: string;
  }[];
  userId: string;
  eventId?: string;
}

export function EventForm({
  mode,
  initialData,
  venues,
  artists,
  userId,
  eventId,
}: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Event>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialData
      ? ({
          ...initialData,
          // formatDateForForm 함수 사용하여 일관된 형식으로 변환
          startDate: formatDateForForm(initialData.startDate),
          endDate: formatDateForForm(initialData.endDate),
        } as Event)
      : {
          title: '',
          subtitle: '',
          description: '',
          type: EventType.exhibition,
          status: EventStatus.upcoming,
          startDate: formatDateForForm(new Date()),
          endDate: formatDateForForm(new Date()),
          mainImageUrl: '',
          venueId: '',
          organizers: [],
          tickets: [],
        },
  });
  // const { setValue } = useFormContext<EventFormType>();
  // 싱글 이미지 업로드 훅
  const {
    preview,
    imageFile,
    error: fileError,
    uploadURL,
    handleImageChange,
    displayUrl,
  } = useSingleImageUpload({
    initialImage: initialData?.mainImageUrl ?? '',
    onImageUrlChange: (url) => {
      console.log('이미지 URL 설정:', url);
      form.setValue('mainImageUrl', url);
      console.log('현재 폼 값:', form.getValues());
    },
  });

  const formSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 이미지 파일이 있는 경우에만 Cloudflare에 실제 업로드 진행
      if (imageFile) {
        await uploadImage(imageFile, uploadURL);
      }

      const values = form.getValues();
      console.log('Form values:', values);

      // mainImageUrl은 이미 Cloudflare에서 받아온 URL이 설정되어 있음
      if (!values.mainImageUrl) {
        toast({
          title: 'Error',
          description: '이미지 URL을 입력해주세요.',
        });
        setIsSubmitting(false);
        return;
      }
      if (!values.venueId) {
        toast({
          title: 'Error',
          description: '장소를 선택해주세요.',
        });
        setIsSubmitting(false);
        return;
      }

      // 이벤트 생성 또는 수정
      const result =
        mode === 'edit'
          ? await updateEvent(eventId!, values)
          : await createEvent(values, userId);

      // 결과 처리 개선
      if (result && 'ok' in result && result.ok) {
        toast({
          title: 'Success',
          description:
            mode === 'edit'
              ? '이벤트가 수정되었습니다.'
              : '이벤트가 생성되었습니다.',
        });

        // ID 참조 통일
        const resultId = mode === 'edit' ? eventId : result.data?.id;
        if (resultId) {
          router.push(`/events/${resultId}`);
        } else {
          router.push('/events');
        }
      } else {
        const errorMessage =
          result && 'error' in result
            ? result.error
            : '처리 중 오류가 발생했습니다.';
        toast({
          title: 'Error',
          description: errorMessage,
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
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(formSubmit)} className="space-y-8">
          <div className="space-y-6">
            {/* 이미지 업로드 섹션 */}
            <FormField
              control={form.control}
              name="mainImageUrl"
              render={({ field }) => (
                <FormItem>
                  <SingleImageBox
                    register={field}
                    preview={preview}
                    displayUrl={displayUrl}
                    error={fileError}
                    handleImageChange={handleImageChange}
                    aspectRatio="square"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 기본 정보 섹션 */}
            <BasicInfoSection control={form.control} />

            {/* 일정 및 장소 섹션 */}
            <DateVenueSection control={form.control} venues={venues} />

            {/* 주최자 섹션 */}
            <OrganizersSection
              control={form.control}
              artists={artists}
              userId={userId!}
            />

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
