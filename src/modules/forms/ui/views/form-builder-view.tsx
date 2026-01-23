'use client';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { useToast } from '@/hooks/use-toast';
import type { FormFieldInput, FormInput } from '@/lib/schemas/form';
import { formSchema } from '@/lib/schemas/form';
import { getImageUrl, uploadImage } from '@/lib/utils';
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
  const [showPreview, setShowPreview] = useState(false);
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
      body: '',
      coverImage: '',
      status: 'draft',
      fields: [],
    },
  });

  const status = watch('status');
  const title = watch('title');
  const description = watch('description');
  const body = watch('body');
  const slug = watch('slug');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cover image upload
  const {
    preview,
    displayUrl,
    imageFile,
    uploadURL,
    error: imageError,
    handleImageChange,
    finalizeUpload,
  } = useSingleImageUpload({
    initialImage: initialData?.coverImage ?? '',
    onImageUrlChange: (url) => setValue('coverImage', url),
  });

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
    updatedFields[index] = { ...field, order: index };
    setFields(updatedFields);
    setValue('fields', updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields
      .filter((_, i) => i !== index)
      .map((field, i) => ({ ...field, order: i }));
    setFields(updatedFields);
    setValue('fields', updatedFields);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      const updatedFields = arrayMove(fields, oldIndex, newIndex).map(
        (field, i) => ({ ...field, order: i })
      );
      setFields(updatedFields);
      setValue('fields', updatedFields);
    }
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
      // Upload cover image if new image selected
      if (imageFile) {
        const uploadSuccess = await uploadImage(imageFile, uploadURL);
        if (!uploadSuccess) {
          toast({
            title: '이미지 업로드 실패',
            description: '이미지를 업로드하는 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
          return;
        }
        finalizeUpload();
      }

      // Ensure all fields have correct order and remove temporary ids
      const fieldsToSubmit = fields.map((field, index) => {
        const { id, ...fieldData } = field;
        return {
          ...fieldData,
          order: index,
        };
      });

      console.log('Submitting form data:', { ...data, fields: fieldsToSubmit });
      const result = await onSubmit({ ...data, fields: fieldsToSubmit });
      if (result.success) {
        toast({
          title: '저장 완료',
          description: '폼이 성공적으로 저장되었습니다',
        });
        router.push('/admin/forms');
      } else {
        console.error('Form save error:', result.error);
        toast({
          title: '저장 실패',
          description: result.error || '알 수 없는 오류가 발생했습니다',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Form submit error:', error);
      toast({
        title: '저장 실패',
        description:
          error instanceof Error
            ? error.message
            : '폼 저장 중 오류가 발생했습니다',
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
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="body">상세 안내 (선택)</Label>
            <Textarea
              id="body"
              {...register('body')}
              placeholder="폼에 대한 상세한 안내사항이나 주의사항을 입력하세요"
              rows={5}
            />
          </div>

          <div>
            <Label>커버 이미지 (선택)</Label>
            <p className="mb-2 text-sm text-neutral-500">
              권장 사이즈: 1920x600px (16:9 비율) 또는 1200x400px (3:1 비율)
            </p>
            <SingleImageBox
              register={{ name: 'coverImage', onBlur: () => {}, ref: () => {} }}
              preview={preview}
              displayUrl={displayUrl}
              error={imageError}
              handleImageChange={handleImageChange}
              aspectRatio="video"
            />
            {imageError && (
              <p className="mt-2 text-sm text-red-600">{imageError}</p>
            )}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id || '')}
              strategy={verticalListSortingStrategy}
            >
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
            </SortableContext>
          </DndContext>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
          disabled={isSubmitting}
        >
          미리보기
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : submitLabel}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>폼 미리보기</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cover Image */}
            {(displayUrl || initialData?.coverImage) && (
              <div className="relative aspect-[16/5] w-full overflow-hidden rounded-lg">
                <Image
                  src={
                    displayUrl ||
                    initialData?.coverImage ||
                    getImageUrl(null, 'public')
                  }
                  alt={title || '폼 커버'}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h1 className="mb-2 text-3xl font-bold">
                    {title || '제목 없음'}
                  </h1>
                  {description && (
                    <p className="text-lg opacity-90">{description}</p>
                  )}
                </div>
              </div>
            )}

            {/* No Cover Image */}
            {!displayUrl && !initialData?.coverImage && (
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{title || '제목 없음'}</h1>
                {description && (
                  <p className="text-lg text-muted-foreground">{description}</p>
                )}
              </div>
            )}

            {/* Detailed Information (below image) */}
            {body && (
              <div className="rounded-lg border bg-neutral-50 p-6">
                <p className="whitespace-pre-wrap leading-relaxed text-neutral-700">
                  {body}
                </p>
              </div>
            )}

            {/* Form Fields Preview */}
            <div className="rounded-lg border bg-white p-6">
              {fields.length === 0 ? (
                <p className="text-center text-neutral-500">필드가 없습니다</p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id || index} className="space-y-2">
                      <Label>
                        {field.label || `필드 ${index + 1}`}
                        {field.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </Label>
                      {field.helpText && (
                        <p className="text-sm text-muted-foreground">
                          {field.helpText}
                        </p>
                      )}
                      {/* Render appropriate input based on field type */}
                      {field.type === 'text' && (
                        <Input
                          placeholder={field.placeholder || '텍스트 입력'}
                          disabled
                        />
                      )}
                      {field.type === 'textarea' && (
                        <Textarea
                          placeholder={field.placeholder || '텍스트 입력'}
                          rows={3}
                          disabled
                        />
                      )}
                      {field.type === 'number' && (
                        <Input
                          type="number"
                          placeholder={field.placeholder || '숫자 입력'}
                          disabled
                        />
                      )}
                      {field.type === 'email' && (
                        <Input
                          type="email"
                          placeholder={field.placeholder || '이메일 입력'}
                          disabled
                        />
                      )}
                      {field.type === 'phone' && (
                        <Input
                          type="tel"
                          placeholder={field.placeholder || '전화번호 입력'}
                          disabled
                        />
                      )}
                      {field.type === 'url' && (
                        <Input
                          type="url"
                          placeholder={field.placeholder || 'URL 입력'}
                          disabled
                        />
                      )}
                      {field.type === 'date' && <Input type="date" disabled />}
                      {field.type === 'select' && (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={field.placeholder || '선택해주세요'}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt, i) => (
                              <SelectItem key={i} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === 'radio' && (
                        <div className="space-y-2">
                          {field.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                disabled
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {field.type === 'checkbox' && (
                        <div className="space-y-2">
                          {field.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                disabled
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {field.type === 'file' && (
                        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                          <span>파일 선택</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
