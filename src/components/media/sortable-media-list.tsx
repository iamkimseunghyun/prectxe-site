'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Loader2, Video, X } from 'lucide-react';
import Image from 'next/image';
import { type ChangeEvent, useRef } from 'react';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { Button } from '@/components/ui/button';

export type MediaItem = {
  /** 고유 ID — 미리보기 URL 또는 기존 media의 id 사용 */
  id: string;
  type: 'image' | 'video';
  /** 업로드 완료 후 최종 URL (Cloudflare Images URL 또는 Stream ID) */
  url: string;
  /** 미리보기 URL — blob: 또는 최종 URL */
  preview: string;
  /** 업로드 대기 중인 파일 */
  file: File | null;
  /** Cloudflare 업로드 엔드포인트 */
  uploadURL?: string;
  /** 업로드 진행률 0-100 (video 업로드 중) */
  progress?: number;
  /** 업로드 상태 */
  status?: 'pending' | 'uploading' | 'done' | 'error';
  alt: string;
  error?: string;
};

interface SortableMediaListProps {
  items: MediaItem[];
  onReorder: (next: MediaItem[]) => void;
  onRemove: (id: string) => void;
  onAddImages: (files: FileList) => void;
  onAddVideos: (files: FileList) => void;
  disabled?: boolean;
}

export function SortableMediaList({
  items,
  onReorder,
  onRemove,
  onAddImages,
  onAddVideos,
  disabled,
}: SortableMediaListProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((m) => m.id === active.id);
    const newIdx = items.findIndex((m) => m.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx));
  }

  function handleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
    }
    e.target.value = '';
  }

  function handleVideosChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onAddVideos(e.target.files);
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <DndContext
          id="sortable-media-list"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m, idx) => (
                <SortableMediaItem
                  key={m.id}
                  item={m}
                  index={idx}
                  onRemove={() => onRemove(m.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 첫 번째 아이템 안내 */}
      {items.length > 0 && items[0]?.type === 'image' && (
        <p className="text-xs text-neutral-500">
          맨 앞(왼쪽 상단) 이미지가 포스터·썸네일·OG 이미지로 사용됩니다.
          드래그해 순서를 조정하세요.
        </p>
      )}
      {items.length > 0 && items[0]?.type === 'video' && (
        <p className="text-xs text-amber-600">
          ⚠ 첫 아이템이 영상입니다. 포스터·OG 이미지용으로는 이미지를 맨 앞으로
          이동해 주세요.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus className="mr-1 h-4 w-4" /> 이미지 추가
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled}
        >
          <Video className="mr-1 h-4 w-4" /> 영상 추가
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImagesChange}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleVideosChange}
          className="hidden"
        />
      </div>
      <p className="text-xs text-neutral-400">
        이미지 1장당 10MB, 영상 1개당 200MB 이하. 여러 개 업로드 가능.
      </p>
    </div>
  );
}

interface SortableMediaItemProps {
  item: MediaItem;
  index: number;
  onRemove: () => void;
}

function SortableMediaItem({ item, index, onRemove }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isUploading = item.status === 'uploading';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-md border bg-neutral-50"
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-white/80 text-neutral-600 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 active:cursor-grabbing"
        aria-label="드래그로 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 순서 뱃지 */}
      <div className="absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/70 px-2 text-xs font-semibold text-white">
        {index + 1}
      </div>

      {/* 삭제 */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        aria-label="삭제"
      >
        <X className="h-4 w-4" />
      </button>

      {/* 타입 뱃지 */}
      <div className="absolute left-2 bottom-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        {item.type}
      </div>

      {/* 콘텐츠 */}
      <div className="aspect-square w-full bg-black">
        {item.type === 'image' ? (
          item.preview.startsWith('blob:') ? (
            // biome-ignore lint/performance/noImgElement: blob URL은 next/image 지원 불가
            <img
              src={item.preview}
              alt={item.alt}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={item.preview}
              alt={item.alt}
              width={400}
              height={400}
              className="h-full w-full object-cover"
            />
          )
        ) : item.preview.startsWith('blob:') ? (
          <video
            src={item.preview}
            className="h-full w-full object-cover"
            muted
          />
        ) : (
          <CloudflareStreamVideo
            videoUrl={item.preview}
            className="h-full w-full object-cover"
            controls={false}
          />
        )}
      </div>

      {/* 업로드 진행 표시 */}
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
          <Loader2 className="mb-2 h-6 w-6 animate-spin" />
          {typeof item.progress === 'number' ? (
            <>
              <div className="text-xs font-medium">
                {Math.round(item.progress)}%
              </div>
              <div className="mt-2 h-1.5 w-3/4 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs">업로드 중...</div>
          )}
        </div>
      )}

      {/* 에러 */}
      {item.error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-500/90 px-2 py-1 text-center text-xs text-white">
          {item.error}
        </div>
      )}
    </div>
  );
}
