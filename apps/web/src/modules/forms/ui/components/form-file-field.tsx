'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { type ChangeEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getImageUrl, uploadImage, validateImageFile } from '@/lib/utils';
import { getFormFileUploadUrl } from '@/modules/forms/server/actions';

interface FormFileFieldProps {
  formId: string;
  fieldId: string;
  inputId: string;
  value: string;
  onChange: (url: string) => void;
  /** 업로드 중에는 폼 제출을 막기 위해 부모에 상태를 알린다. */
  onUploadingChange: (fieldId: string, uploading: boolean) => void;
}

/**
 * 공개 폼의 파일(이미지) 업로드 필드.
 *
 * 저장되는 값은 Cloudflare Images URL 문자열이라, 파일을 고르는 즉시 업로드하고
 * 성공한 URL만 RHF 값으로 넘긴다. 업로드 URL은 1회용이므로 매번 새로 발급받는다.
 */
export function FormFileField({
  formId,
  fieldId,
  inputId,
  value,
  onChange,
  onUploadingChange,
}: FormFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change가 발생하도록 초기화
    e.target.value = '';
    if (!file) return;

    setError('');

    try {
      validateImageFile(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '파일을 확인할 수 없습니다.'
      );
      return;
    }

    setIsUploading(true);
    onUploadingChange(fieldId, true);
    try {
      const result = await getFormFileUploadUrl(formId, fieldId);
      if (!result.success || !result.data) {
        setError(result.error || '업로드 준비에 실패했습니다.');
        return;
      }

      const uploaded = await uploadImage(file, result.data.uploadURL);
      if (!uploaded) {
        setError('업로드에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      setFileName(file.name);
      onChange(result.data.imageUrl);
    } catch (err) {
      console.error('Form file upload error:', err);
      setError('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
      onUploadingChange(fieldId, false);
    }
  };

  const handleRemove = () => {
    setFileName('');
    setError('');
    onChange('');
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Image
            src={getImageUrl(value, 'thumbnail')}
            alt={fileName || '업로드된 이미지'}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded object-cover"
          />
          <p className="flex-1 truncate text-sm text-neutral-600">
            {fileName || '업로드 완료'}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label="업로드한 파일 삭제"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 p-6 text-neutral-500 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 motion-safe:animate-spin" />
              <span className="text-sm">업로드 중...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">이미지를 선택해주세요</span>
              <span className="text-xs text-neutral-400">
                JPG, PNG, GIF, WEBP, HEIC · 최대 20MB
              </span>
            </>
          )}
        </button>
      )}

      <p aria-live="polite" className="sr-only">
        {isUploading ? '업로드 중입니다' : value ? '업로드 완료' : ''}
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
