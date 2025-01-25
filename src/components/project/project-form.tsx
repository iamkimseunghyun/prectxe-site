'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  projectCreateSchema,
  ProjectFormData,
} from '@/lib/validations/project';
import { formatDate } from '@/lib/utils';
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
import { createProject, updateProject } from '@/app/projects/new/project';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useGalleryImages } from '@/hooks/use-gallery-images';
import GalleryImageSection from '@/components/image/gallery-image-section';
import SingleImageSection from '@/components/image/single-image-section';
import { GalleryImage, GalleryPreview } from '@/lib/validations/gallery-image';

type ProjectFormProps = {
  mode: 'create' | 'edit';
  initialData?: ProjectFormData;
  projectId?: string;
};

const ProjectForm = ({ mode, initialData, projectId }: ProjectFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: initialData || {
      title: '',
      year: new Date().getFullYear(),
      category: undefined,
      description: '',
      content: '',
      mainImageUrl: '',
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date()),
      galleryImageUrls: [],
    },
  });

  // 싱글 이미지 업로드 훅
  const {
    preview,
    imageFile,
    fileError,
    uploadURL,
    handleImageChange,
    imageUrl,
    displayUrl,
  } = useImageUpload({
    initialImage: initialData?.mainImageUrl,
    onImageUrlChange: (url) => {
      setValue('mainImageUrl', url);
    },
  });

  // 갤러리 이미지 훅
  const {
    galleryPreviews,
    fileError: galleryError,
    handleGalleryImageChange,
    removeGalleryImage,
  } = useGalleryImages({
    initialImages: initialData?.galleryImageUrls,
    onGalleryChange: (galleryData) => {
      setValue('galleryImageUrls', galleryData);
    },
  });

  const uploadSingleImage = async (imageFile: File) => {
    if (imageFile) {
      const cloudFlareForm = new FormData();
      cloudFlareForm.append('file', imageFile);
      const response = await fetch(uploadURL, {
        method: 'POST',
        body: cloudFlareForm,
      });
      if (response.status !== 200) {
        throw new Error('Failed to upload main image');
      }
    }
  };

  const uploadGalleryImages = async (previews: GalleryPreview[]) => {
    return Promise.all(
      previews.map(async (preview) => {
        const formData = new FormData();
        formData.append('file', preview.file!);
        const response = await fetch(preview.uploadURL, {
          method: 'POST',
          body: formData,
        });
        if (response.status !== 200) {
          throw new Error(`Failed to upload: ${preview.alt}`);
        }
      })
    );
  };

  const prepareFormData = (
    data: ProjectFormData,
    galleryData: GalleryImage[]
  ) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('year', data.year.toString());
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('content', data.content);
    formData.append('mainImageUrl', imageUrl);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    formData.append('galleryImageUrls', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: ProjectFormData) => {
    try {
      if (imageFile) {
        await uploadSingleImage(imageFile);
      }
      if (galleryPreviews.length > 0) {
        await uploadGalleryImages(galleryPreviews);
      }

      const formData = prepareFormData(data, data.galleryImageUrls);

      const result =
        mode === 'edit'
          ? await updateProject(formData, projectId!)
          : await createProject(formData);

      if (!result.ok) throw new Error(result.error);
      router.push(`/projects/${result.data?.id}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : '프로젝트 등록 실패');
    }
  });

  const onValid = async () => {
    await onSubmit();
  };

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

        <form action={onValid}>
          <CardContent className="space-y-6">
            <SingleImageSection
              register={register}
              preview={preview}
              fileError={fileError}
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
                  <Input
                    type="date"
                    {...register('startDate')}
                    defaultValue={formatDate(new Date())}
                  />
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
                  <Input
                    type="date"
                    {...register('endDate')}
                    defaultValue={formatDate(new Date())}
                  />
                  {errors.endDate && (
                    <p id="endDate-error" className="text-sm text-destructive">
                      {errors.endDate?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* 갤러리 이미지 섹션 */}
            <GalleryImageSection
              register={register}
              galleryPreviews={galleryPreviews}
              galleryError={galleryError}
              handleGalleryImageChange={handleGalleryImageChange}
              removeGalleryImage={removeGalleryImage}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                {...register('description')}
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
              {errors?.description && (
                <p id="description-error" className="text-sm text-destructive">
                  {errors.description?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                {...register('content')}
                placeholder="프로젝트의 상세 내용을 입력하세요"
                rows={8}
              />
              {errors?.content && (
                <p id="content-error" className="text-sm text-destructive">
                  {errors.content?.message}
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
        </form>
      </Card>
    </div>
  );
};

export default ProjectForm;
