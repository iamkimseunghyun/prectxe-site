'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  projectCreateSchema,
  ProjectFormData,
} from '@/lib/validations/project';
import {
  formatDate,
  formatDateForInput,
  uploadGalleryImages,
  uploadSingleImage,
} from '@/lib/utils';
import { categories } from '@/lib/constants/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { createProject, updateProject } from '@/app/projects/actions';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import SingleImageBox from '@/components/image/single-image-box';
import MultiImageBox from '@/components/image/multi-image-box';

type ProjectFormProps = {
  mode: 'create' | 'edit';
  initialData?: ProjectFormData;
  projectId?: string;
};

const ProjectForm = ({ mode, initialData, projectId }: ProjectFormProps) => {
  const router = useRouter();

  // initialData가 있으면 날짜 형식만 변환
  const defaultValues = initialData
    ? {
        ...initialData,
        startDate: formatDateForInput(initialData.startDate),
        endDate: formatDateForInput(initialData.endDate),
      }
    : {
        title: '',
        year: new Date().getFullYear(),
        category: undefined,
        description: '',
        about: '',
        mainImageUrl: '',
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date()),
        images: [],
      };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues,
  });

  // 싱글 이미지 업로드 훅
  const {
    preview,
    imageFile,
    uploadURL,
    handleImageChange,
    imageUrl,
    displayUrl,
  } = useSingleImageUpload({
    initialImage: initialData?.mainImageUrl,
    onImageUrlChange: (url) => {
      setValue('mainImageUrl', url);
    },
  });

  // 갤러리 이미지 훅
  const {
    multiImagePreview,
    error: fileError,
    handleMultiImageChange,
    removeMultiImage,
  } = useMultiImageUpload({
    initialImages: initialData?.images,
    onGalleryChange: (galleryData) => {
      setValue('images', galleryData);
    },
  });

  const prepareFormData = (
    data: ProjectFormData,
    galleryData: GalleryImage[]
  ) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('year', data.year.toString());
    formData.append('category', data.category);
    formData.append('about', data.about);
    formData.append('description', data.description);
    formData.append('mainImageUrl', imageUrl);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    formData.append('images', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: ProjectFormData) => {
    try {
      if (imageFile) {
        await uploadSingleImage(imageFile, uploadURL);
      }
      if (multiImagePreview.length > 0) {
        await uploadGalleryImages(multiImagePreview);
      }

      const formData = prepareFormData(data, data.images);

      const result =
        mode === 'edit'
          ? await updateProject(formData, projectId!)
          : await createProject(formData);

      if (!result.ok) throw new Error(result.error);
      router.push(`/projects/${result.data?.id}`);
    } catch (error) {
      console.error(error);
      setError('root', {
        message: error instanceof Error ? error.message : '프로젝트 등록 실패',
      });
    }
  });

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'create' ? '프로젝트 등록' : '프로젝트 수정'}
          </CardTitle>
          <CardDescription>
            새로운 프로젝트의 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <SingleImageBox
              register={register('mainImageUrl')}
              preview={preview}
              error={fileError}
              displayUrl={displayUrl}
              handleImageChange={handleImageChange}
            />
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">제목</label>
                <Input
                  placeholder="프로젝트 제목을 입력하세요"
                  {...register('title')}
                />
                {errors.title && (
                  <p id="title-error" className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">연도</label>
                  <Input
                    type="number"
                    defaultValue={new Date().getFullYear()}
                    min={2018}
                    max={new Date().getFullYear()}
                    {...register('year', { valueAsNumber: true })}
                  />
                  {errors.year && (
                    <p id="year-error" className="text-sm text-destructive">
                      {errors.year.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">카테고리</label>
                  <Select
                    onValueChange={(
                      value:
                        | 'exhibition'
                        | 'performance'
                        | 'festival'
                        | 'workshop'
                    ) => setValue('category', value)}
                    value={watch('category')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p id="category-error" className="text-sm text-destructive">
                      {errors.category?.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">시작일</label>
                  <Input type="date" {...register('startDate')} />
                  {errors.startDate && (
                    <p
                      id="startDate-error"
                      className="text-sm text-destructive"
                    >
                      {errors.startDate?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">종료일</label>
                  <Input type="date" {...register('endDate')} />
                  {errors.endDate && (
                    <p id="endDate-error" className="text-sm text-destructive">
                      {errors.endDate?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* 갤러리 이미지 섹션 */}
            <MultiImageBox
              register={register('images')}
              previews={multiImagePreview}
              error={fileError}
              handleMultiImageChange={handleMultiImageChange}
              removeMultiImage={removeMultiImage}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">간단 소개</label>
              <Textarea
                {...register('about')}
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
              {errors?.about && (
                <p id="description-error" className="text-sm text-destructive">
                  {errors.about?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">상세 내용</label>
              <Textarea
                {...register('description')}
                placeholder="프로젝트의 상세 내용을 입력하세요"
                rows={8}
              />
              {errors?.description && (
                <p id="content-error" className="text-sm text-destructive">
                  {errors.description?.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button type="submit">
              {mode === 'edit' ? '수정하기' : '등록하기'}
            </Button>
          </CardFooter>
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ProjectForm;
