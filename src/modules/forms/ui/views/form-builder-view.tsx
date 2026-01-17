'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { FormFieldInput, FormInput } from '@/lib/schemas/form';
import { formSchema } from '@/lib/schemas/form';
import { FormFieldEditor } from '../components/form-field-editor';

interface FormBuilderViewProps {
  initialData?: FormInput;
  onSubmit: (data: FormInput) => Promise<{
    success: boolean;
    error?: string;
  }>;
  submitLabel?: string;
}

export function FormBuilderView({
  initialData,
  onSubmit,
  submitLabel = '저장',
}: FormBuilderViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<FormFieldInput[]>(
    initialData?.fields || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      slug: '',
      title: '',
      description: '',
      status: 'draft',
      fields: [],
    },
  });

  const status = watch('status');

  const addField = () => {
    const newField: FormFieldInput = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      options: [],
      order: fields.length,
    };
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setValue('fields', updatedFields);
  };

  const updateField = (index: number, field: FormFieldInput) => {
    const updatedFields = [...fields];
    updatedFields[index] = field;
    setFields(updatedFields);
    setValue('fields', updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    setValue('fields', updatedFields);
  };

  const handleFormSubmit = async (data: FormInput) => {
    if (fields.length === 0) {
      toast({
        title: '필드 추가 필요',
        description: '최소 1개의 필드를 추가해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({ ...data, fields });
      if (result.success) {
        toast({
          title: '저장 완료',
          description: '폼이 성공적으로 저장되었습니다',
        });
        router.push('/admin/forms');
      } else {
        toast({
          title: '저장 실패',
          description: result.error || '알 수 없는 오류가 발생했습니다',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '폼 저장 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="mx-auto max-w-4xl space-y-8"
    >
      {/* Basic Info */}
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">기본 정보</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">
              폼 제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="예: 2025 워크숍 참가 신청"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">
              URL 슬러그 <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">/forms/</span>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="2025-workshop-application"
              />
            </div>
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">폼 설명 (선택)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="이 폼에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="status">상태</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setValue('status', value as 'draft' | 'published' | 'closed')
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="published">게시</SelectItem>
                <SelectItem value="closed">마감</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4 rounded-lg border bg-neutral-50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">폼 필드</h2>
          <Button type="button" onClick={addField} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            필드 추가
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-white py-12 text-center">
            <p className="mb-2 text-neutral-500">필드가 없습니다</p>
            <Button type="button" onClick={addField} variant="outline">
              <Plus className="mr-2 h-4 w-4" />첫 필드 추가
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <FormFieldEditor
                key={field.id || index}
                field={field}
                index={index}
                onUpdate={updateField}
                onRemove={removeField}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
