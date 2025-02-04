import { ChangeEvent, useState } from 'react';
import { uploadImage } from '@/lib/utils';
import validateImageFile from '@/hooks/validate-file';
import { getCloudflareImageUrl } from '@/app/actions/actions';

type ImageUploadProps = {
  initialImage?: string;
  onImageUrlChange?: (url: string) => void;
};

export function useFormSingleImageUpload({
  initialImage,
  onImageUrlChange,
}: ImageUploadProps) {
  const [preview, setPreview] = useState({
    url: initialImage || '',
    isCloudflare: !!initialImage,
  });

  const [error, setError] = useState('');

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    setError('');

    try {
      validateImageFile(file);
      console.log('File validation passed');
      // 로컬 프리뷰 만들기
      const previewUrl = URL.createObjectURL(file);
      setPreview({ url: previewUrl, isCloudflare: false });
      console.log('Local preview created:', previewUrl);

      // 클라우드플레어 업로드 주소 받기
      // const { success, result } = await getUploadedProductImageURL();
      console.log('Getting Cloudflare upload URL...');
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      console.log('Got Cloudflare upload URL:', uploadURL);
      console.log('Generated image URL will be:', imageUrl);

      // 이미지 업로드
      console.log('Uploading image to Cloudflare...');
      const uploadSuccess = await uploadImage(file, uploadURL);
      if (!uploadSuccess) {
        console.error('Failed to upload image to Cloudflare');
        throw new Error('Failed to upload image');
      }
      console.log('Image upload successful');

      // URL 설정
      if (imageUrl) {
        setPreview({ url: imageUrl, isCloudflare: true });
        console.log('Setting final image URL:', imageUrl);
        onImageUrlChange?.(imageUrl);
      }
    } catch (error) {
      console.error('이미지 처리 중 에러가 발생했습니다.', error);
      setError('이미지 처리 중 에러가 발생했습니다.');
    }
  };

  // displayUrl 계산 로직
  const displayUrl = preview.url;

  return {
    preview,
    error,
    handleImageChange,
    displayUrl,
  };
}
