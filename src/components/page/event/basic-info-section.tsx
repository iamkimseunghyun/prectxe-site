import { Control } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { EventFormType } from '@/app/events/event';

interface BasicInfoSectionProps {
  control: Control<EventFormType>;
}

const EVENT_TYPES = [
  { value: 'exhibition', label: '전시' },
  { value: 'performance', label: '공연' },
  { value: 'workshop', label: '워크샵' },
  { value: 'talk', label: '토크' },
  { value: 'festival', label: '페스티벌' },
  { value: 'screening', label: '상영' },
  { value: 'other', label: '기타' },
] as const;

const EVENT_STATUS = [
  { value: 'upcoming', label: '예정됨' },
  { value: 'ongoing', label: '진행중' },
  { value: 'completed', label: '종료됨' },
  { value: 'cancelled', label: '취소됨' },
] as const;

const BasicInfoSection = ({ control }: BasicInfoSectionProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <h3 className="text-lg font-medium">기본 정보</h3>

          {/* 대표 이미지 */}

          {/* 제목 */}
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>제목</FormLabel>
                <FormControl>
                  <Input placeholder="이벤트 제목을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 부제목 */}
          <FormField
            control={control}
            name="subtitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>부제목 (선택사항)</FormLabel>
                <FormControl>
                  <Input placeholder="부제목을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 설명 */}
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>설명</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="이벤트 설명을 입력하세요"
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 이벤트 유형 */}
          <FormField
            control={control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이벤트 유형</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="이벤트 유형을 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 상태 */}
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>상태</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="이벤트 상태를 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;
