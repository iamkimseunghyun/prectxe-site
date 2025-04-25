'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import SingleImageBox from '@/components/image/single-image-box';
import MultiImageBox from '@/components/image/multi-image-box';
import UploadProgress from '@/components/icons/upload-progress';
import FormSubmitButton from '@/components/layout/form-submit-button';

import {
  CreateProjectInput,
  createProjectSchema,
  projectSchema,
  UpdateProjectInput,
} from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  createProject,
  updateProject,
} from '@/modules/projects/server/actions';
import ArtistSelect from '@/modules/artists/ui/components/artist-select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type ProjectFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateProjectInput | UpdateProjectInput;
  projectId?: string;
  userId?: string;
  artists?: { mainImageUrl: string | null; id: string; name: string }[];
};

const ProjectFormView = ({
  mode,
  initialData,
  projectId,
  userId,
  artists,
}: ProjectFormProps) => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues,
  });

  // 싱글 이미지 업로드 훅
  const { preview, imageFile, uploadURL, handleImageChange, displayUrl } =
    useSingleImageUpload({
      initialImage: initialData?.mainImageUrl,
      onImageUrlChange: (url) => {
        form.setValue('mainImageUrl', url);
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
      form.setValue('images', galleryData);
    },
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof projectSchema>) => {
      setIsSubmitting(true);
      try {
        setIsUploading(true);
        setUploadStatus('메인 이미지 업로드 중...');

        if (imageFile) {
          await uploadSingleImage(imageFile, uploadURL);
        }
        if (multiImagePreview.length > 0) {
          setUploadStatus('갤러리 이미지 업로드 중...');
          setUploadProgress(40);
          await uploadGalleryImages(multiImagePreview);
        }

        setUploadStatus('프로젝트 정보 저장 중...');
        setUploadProgress(70);

        const result =
          mode === 'edit'
            ? await updateProject(data, projectId!)
            : await createProject(data, userId!);

        setUploadProgress(100);
        setUploadStatus('완료! 페이지 이동 중...');

        if (!result.ok) return new Error(result.error);
        router.push(`/projects/${result.data?.id}`);
      } catch (error) {
        console.error(error);
        form.setError('root', {
          message:
            error instanceof Error ? error.message : '프로젝트 등록 실패',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <UploadProgress
        isUploading={isUploading}
        progress={uploadProgress}
        status={uploadStatus}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'create' ? '프로젝트 등록' : '프로젝트 수정'}
          </CardTitle>
          <CardDescription>
            새로운 프로젝트의 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 이미지</FormLabel>
                    <FormControl>
                      <SingleImageBox
                        register={field}
                        preview={preview}
                        error={fileError}
                        displayUrl={displayUrl}
                        handleImageChange={handleImageChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                name="mainImageUrl"
              />
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        제목
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="프로젝트 제목을 입력하세요"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          연도
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2018}
                            max={new Date().getFullYear()}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          유형
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.value}
                                  value={category.value}
                                >
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          시작일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          종료일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* 갤러리 이미지 섹션 */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>프로젝트 이미지 </FormLabel>
                    <FormControl>
                      <MultiImageBox
                        register={field}
                        previews={multiImagePreview}
                        error={fileError}
                        handleMultiImageChange={handleMultiImageChange}
                        removeMultiImage={removeMultiImage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectArtists"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      참여 아티스트
                    </FormLabel>
                    <FormControl>
                      <ArtistSelect
                        artists={artists!}
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      간단 소개
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      상세 내용
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                        rows={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <FormSubmitButton
                type="submit"
                loading={isSubmitting}
                loadingText={mode === 'edit' ? '수정하기' : '등록하기'}
              >
                {mode === 'edit' ? '수정하기' : '등록하기'}
              </FormSubmitButton>
            </CardFooter>
            {form.formState.errors.root && (
              <p className="text-sm text-red-500">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ProjectFormView;
