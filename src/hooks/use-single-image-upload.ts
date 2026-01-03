import { type ChangeEvent, useState } from 'react';
import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import validateImageFile, { getImageUrl } from '@/lib/utils';

type ImageUploadProps = {
  initialImage?: string | null;
  onImageUrlChange?: (url: string) => void;
};

export function useSingleImageUpload({
  initialImage,
  onImageUrlChange,
}: ImageUploadProps) {
  const [preview, setPreview] = useState({
    url: initialImage || '',
    isCloudflare: !!initialImage,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploadURL, setUploadURL] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    try {
      validateImageFile(file);

      // 로컬 프리뷰 만들기
      const previewUrl = URL.createObjectURL(file);
      setPreview({ url: previewUrl, isCloudflare: false });

      setImageFile(file);

      // 클라우드플레어 업로드 주소 받기
      // const { success, result } = await getUploadedProductImageURL();
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      setUploadURL(uploadURL);
      setImageUrl(imageUrl);
      onImageUrlChange?.(imageUrl);
    } catch (error) {
      console.error('이미지 처리 중 에러가 발생했습니다.', error);
      setError('이미지 처리 중 에러가 발생했습니다.');
    }
  };

  // displayUrl 계산 로직
  const displayUrl = preview.url
    ? preview.isCloudflare
      ? getImageUrl(preview.url, 'public')
      : preview.url
    : '';

  return {
    preview,
    imageFile,
    error,
    uploadURL,
    handleImageChange,
    imageUrl,
    displayUrl,
    finalizeUpload: () => {
      // If imageUrl has been assigned from Cloudflare, mark preview as cloudflare and clear temp states
      if (imageUrl) {
        setPreview({ url: imageUrl, isCloudflare: true });
      }
      setImageFile(null);
      setError('');
      setUploadURL('');
    },
    uploading,
    retryUpload: async (
      uploader: (file: File, url: string) => Promise<any>
    ) => {
      if (!imageFile) return false;
      try {
        setUploading(true);
        const { uploadURL: newURL, imageUrl: newImg } =
          await getCloudflareImageUrl();
        setUploadURL(newURL);
        setImageUrl(newImg);
        await uploader(imageFile, newURL);
        // finalize on success
        if (newImg) {
          setPreview({ url: newImg, isCloudflare: true });
        }
        setImageFile(null);
        setError('');
        setUploadURL('');
        return true;
      } catch (_e) {
        setError('이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
        return false;
      } finally {
        setUploading(false);
      }
    },
  };
}
