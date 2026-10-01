'use client';

import { useCallback, useState } from 'react';
import type { MediaItem } from '@/components/media/sortable-media-list';
import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import { getImageUrl, validateImageFile } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/utils/media-upload';

export type ImageMediaInput = {
  id?: string;
  imageUrl: string;
  alt: string;
  order: number;
};

export type ImageMediaResult = {
  imageUrl: string;
  alt: string;
  order: number;
};

/**
 * 이미지 전용 정렬 업로드 훅 — Artist·Artwork 폼 등 이미지만 다루는 컨텍스트용.
 *
 * 반환된 `items`를 SortableMediaList에 그대로 전달하면 DnD 정렬·미리보기·
 * 업로드 상태가 자동으로 반영됨. 제출 시 `uploadPending()`을 호출해 pending
 * 파일을 Cloudflare에 업로드한 뒤 서버 payload에 쓸 `images` 배열을 받는다.
 *
 * 영상이 필요한 컨텍스트(Drop 등)는 자체 로직을 유지 — 이 훅은 scope 의도적으로 좁힘.
 */
export function useSortableImages(initial: ImageMediaInput[] = []) {
  const [items, setItems] = useState<MediaItem[]>(() =>
    initial.map((m) => ({
      id: m.id ?? m.imageUrl,
      type: 'image',
      url: m.imageUrl,
      preview: getImageUrl(m.imageUrl, 'public'),
      file: null,
      alt: m.alt,
      status: 'done',
    }))
  );

  const updateItem = useCallback((id: string, patch: Partial<MediaItem>) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const addImages = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        validateImageFile(file);
      } catch {
        // 유효성 실패는 호출측에서 별도 toast 처리 — 훅은 조용히 skip
        continue;
      }

      const preview = URL.createObjectURL(file);
      const tempId = preview;
      setItems((prev) => [
        ...prev,
        {
          id: tempId,
          type: 'image',
          url: '',
          preview,
          file,
          alt: '',
          status: 'pending',
        },
      ]);

      try {
        const { uploadURL, imageUrl } = await getCloudflareImageUrl();
        setItems((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, uploadURL, url: imageUrl } : m
          )
        );
      } catch {
        setItems((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, status: 'error', error: '업로드 URL 발급 실패' }
              : m
          )
        );
      }
    }
  }, []);

  const removeMedia = useCallback((id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /**
   * pending 미디어 일괄 업로드. 실패 시 { ok: false } 반환, 성공 시 서버
   * payload에 넣을 images 배열 제공.
   */
  const uploadPending = useCallback(async (): Promise<
    { ok: true; images: ImageMediaResult[] } | { ok: false }
  > => {
    const pending = items.filter(
      (m) => m.file && m.uploadURL && m.status !== 'done'
    );
    for (const item of pending) {
      updateItem(item.id, { status: 'uploading', progress: 0 });
      const ok = await uploadFileWithProgress(
        item.uploadURL as string,
        item.file as File,
        (p) => updateItem(item.id, { progress: p })
      );
      if (ok) {
        updateItem(item.id, { status: 'done', progress: 100 });
      } else {
        updateItem(item.id, { status: 'error', error: '업로드 실패' });
        return { ok: false };
      }
    }

    const images = items
      .filter((m) => m.url)
      .map((m, idx) => ({
        imageUrl: m.url,
        alt: m.alt,
        order: idx,
      }));
    return { ok: true, images };
  }, [items, updateItem]);

  return {
    items,
    setItems,
    addImages,
    removeMedia,
    uploadPending,
  };
}
