import { type ChangeEvent, useEffect, useState } from 'react';

import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import validateImageFile from '@/lib/utils';

// Base image type that represents the core image data
interface BaseImage {
  imageUrl: string;
  alt: string;
  order: number;
}

// Type for image preview with additional properties needed during upload
interface ImagePreview extends BaseImage {
  preview: string;
  file: File | null;
  uploadURL: string;
  error?: string;
  status?: 'idle' | 'uploading' | 'done' | 'error';
  progress?: number; // 0-100
}

// Props interface for the hook
interface ImageUploadHookProps {
  initialImages?: BaseImage[];
  onGalleryChange?: (images: BaseImage[]) => void;
}

// Return type for the hook
interface ImageUploadHookReturn {
  multiImagePreview: ImagePreview[];
  error: string;
  handleMultiImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeMultiImage: (index: number) => void;
  markAllAsUploaded: () => void;
  retryAt: (
    index: number,
    uploader: (file: File, url: string) => Promise<any>
  ) => Promise<boolean>;
  uploadPending: (
    uploader: (file: File, url: string) => Promise<any>
  ) => Promise<{ successCount: number; failCount: number }>;
  retryAtWithProgress: (index: number) => Promise<boolean>;
  uploadPendingWithProgress: () => Promise<{
    successCount: number;
    failCount: number;
  }>;
}

export function useMultiImageUpload({
  initialImages,
  onGalleryChange,
}: ImageUploadHookProps = {}): ImageUploadHookReturn {
  const [multiImagePreview, setMultiImagePreview] = useState<ImagePreview[]>(
    initialImages?.map((image) => ({
      ...image,
      preview: image.imageUrl,
      file: null,
      uploadURL: '',
    })) || []
  );

  const [error, setError] = useState('');

  // 이미지 변경 시 onGalleryChange 호출하는 useEffect 추가
  useEffect(() => {
    if (onGalleryChange && multiImagePreview.length >= 0) {
      const baseImages: BaseImage[] = multiImagePreview.map(
        ({ imageUrl, alt, order }) => ({
          imageUrl,
          alt,
          order,
        })
      );
      onGalleryChange(baseImages);
    }
  }, [multiImagePreview, onGalleryChange]);

  // handleSingleFileUpload 함수 추가
  const handleSingleFileUpload = async (
    file: File,
    index: number,
    startIndex: number
  ): Promise<ImagePreview | null> => {
    const { uploadURL, imageUrl } = await getCloudflareImageUrl();

    const previewUrl = URL.createObjectURL(file);

    return {
      preview: previewUrl,
      file,
      uploadURL: uploadURL,
      imageUrl: imageUrl,
      alt: file.name || 'No description',
      order: startIndex + index,
      status: 'idle',
      progress: 0,
    };
  };

  const handleMultiImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    setError('');

    if (!files?.length) return;

    // 파일들을 실제 배열로 반환

    try {
      // 모든 파일 검증
      const newFiles = Array.from(files);
      newFiles.forEach(validateImageFile);

      const startIndex = multiImagePreview.length;

      // 단일 파일 업로드 함수 사용
      const newPreviews = await Promise.all(
        newFiles.map((file, index) =>
          handleSingleFileUpload(file, index, startIndex)
        )
      );
      const filteredPreviews = newPreviews.filter(
        (preview): preview is ImagePreview => preview !== null
      );

      setMultiImagePreview((prev) => {
        return [...prev, ...filteredPreviews];
      });
    } catch (error) {
      console.error('Error handling gallery images:', error);
      setError(
        error instanceof Error
          ? error.message
          : '이미지 처리 중 오류가 발생했습니다.'
      );
    }
  };

  const removeMultiImage = (index: number) => {
    setMultiImagePreview((prev) => {
      return prev
        .filter((_, i) => i !== index)
        .map((preview, i) => ({
          ...preview,
          order: i,
        }));
    });
  };

  const markAllAsUploaded = () => {
    setMultiImagePreview((prev) =>
      prev.map((p) => ({
        ...p,
        // after Cloudflare upload, ensure preview uses the permanent URL and clear upload-only fields
        preview: p.imageUrl || p.preview,
        file: null,
        uploadURL: '',
        error: undefined,
        status: 'done',
        progress: 100,
      }))
    );
  };

  const retryAt = async (
    index: number,
    uploader: (file: File, url: string) => Promise<any>
  ): Promise<boolean> => {
    const item = multiImagePreview[index];
    if (!item || !item.file) return false;
    try {
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      await uploader(item.file, uploadURL);
      setMultiImagePreview((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          imageUrl,
          preview: imageUrl,
          file: null,
          uploadURL: '',
          error: undefined,
          status: 'done',
          progress: 100,
        } as ImagePreview;
        return next;
      });
      return true;
    } catch (e) {
      setMultiImagePreview((prev) => {
        const next = [...prev];
        if (next[index])
          next[index] = {
            ...next[index],
            error: '업로드 실패. 다시 시도해 주세요.',
            status: 'error',
          } as ImagePreview;
        return next;
      });
      return false;
    }
  };

  const uploadPending = async (
    uploader: (file: File, url: string) => Promise<any>
  ): Promise<{ successCount: number; failCount: number }> => {
    let success = 0;
    let fail = 0;
    for (let i = 0; i < multiImagePreview.length; i++) {
      const item = multiImagePreview[i];
      if (!item.file) continue;
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      try {
        await uploader(item.file, uploadURL);
        success++;
        setMultiImagePreview((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            imageUrl,
            preview: imageUrl,
            file: null,
            uploadURL: '',
            error: undefined,
            status: 'done',
            progress: 100,
          } as ImagePreview;
          return next;
        });
      } catch (e) {
        fail++;
        setMultiImagePreview((prev) => {
          const next = [...prev];
          if (next[i])
            next[i] = {
              ...next[i],
              error: '업로드 실패. 다시 시도해 주세요.',
              status: 'error',
            } as ImagePreview;
          return next;
        });
      }
    }
    return { successCount: success, failCount: fail };
  };

  // Low-level xhr uploader to observe progress
  const xhrUpload = (
    file: File,
    url: string,
    onProgress: (pct: number) => void
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.status);
          else reject(xhr.status);
        }
      };
      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
  };

  const retryAtWithProgress = async (index: number): Promise<boolean> => {
    const item = multiImagePreview[index];
    if (!item || !item.file) return false;
    try {
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      setMultiImagePreview((prev) => {
        const next = [...prev];
        if (next[index])
          next[index] = {
            ...next[index],
            status: 'uploading',
            progress: 0,
            error: undefined,
          } as ImagePreview;
        return next;
      });
      await xhrUpload(item.file, uploadURL, (pct) => {
        setMultiImagePreview((prev) => {
          const next = [...prev];
          if (next[index])
            next[index] = { ...next[index], progress: pct } as ImagePreview;
          return next;
        });
      });
      setMultiImagePreview((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          imageUrl,
          preview: imageUrl,
          file: null,
          uploadURL: '',
          status: 'done',
          progress: 100,
        } as ImagePreview;
        return next;
      });
      return true;
    } catch (status: any) {
      setMultiImagePreview((prev) => {
        const next = [...prev];
        if (next[index])
          next[index] = {
            ...next[index],
            error: `업로드 실패 (HTTP ${status}). 다시 시도해 주세요.`,
            status: 'error',
          } as ImagePreview;
        return next;
      });
      return false;
    }
  };

  const uploadPendingWithProgress = async (): Promise<{
    successCount: number;
    failCount: number;
  }> => {
    let success = 0;
    let fail = 0;
    for (let i = 0; i < multiImagePreview.length; i++) {
      const item = multiImagePreview[i];
      if (!item.file) continue;
      try {
        const { uploadURL, imageUrl } = await getCloudflareImageUrl();
        setMultiImagePreview((prev) => {
          const next = [...prev];
          if (next[i])
            next[i] = {
              ...next[i],
              status: 'uploading',
              progress: 0,
              error: undefined,
            } as ImagePreview;
          return next;
        });
        await xhrUpload(item.file, uploadURL, (pct) => {
          setMultiImagePreview((prev) => {
            const next = [...prev];
            if (next[i])
              next[i] = { ...next[i], progress: pct } as ImagePreview;
            return next;
          });
        });
        success++;
        setMultiImagePreview((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            imageUrl,
            preview: imageUrl,
            file: null,
            uploadURL: '',
            status: 'done',
            progress: 100,
          } as ImagePreview;
          return next;
        });
      } catch (status: any) {
        fail++;
        setMultiImagePreview((prev) => {
          const next = [...prev];
          if (next[i])
            next[i] = {
              ...next[i],
              error: `업로드 실패 (HTTP ${status}). 다시 시도해 주세요.`,
              status: 'error',
            } as ImagePreview;
          return next;
        });
      }
    }
    return { successCount: success, failCount: fail };
  };
  return {
    multiImagePreview,
    error,
    handleMultiImageChange,
    removeMultiImage,
    markAllAsUploaded,
    retryAt,
    uploadPending,
    retryAtWithProgress,
    uploadPendingWithProgress,
  };
}
