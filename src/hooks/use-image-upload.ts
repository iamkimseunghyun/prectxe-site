import { ChangeEvent, useState } from 'react';
import { getUploadedProductImageURL } from '@/app/actions/actions';
import { getImageUrl } from '@/lib/utils';
import { validateFile } from '@/lib/validateFile';

type PreviewType = {
  url: string;
  type: 'cloudflare' | 'local';
};

interface UseImageUploadReturn {
  preview: PreviewType;
  imageFile: File | null;
  fileError: string;
  uploadURL: string;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  imageUrl: string;
  displayUrl: string;
}

export function useImageUpload({
  initialImage,
  onImageUrlChange,
}: {
  initialImage?: string;
  onImageUrlChange?: (url: string) => void;
}): UseImageUploadReturn {
  const [preview, setPreview] = useState<PreviewType>(
    initialImage
      ? { url: initialImage, type: 'cloudflare' }
      : { url: '', type: 'cloudflare' }
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploadURL, setUploadURL] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const {
      target: { files },
    } = e;

    if (!files || files.length === 0) {
      return;
    }

    const localFile = files[0];

    await validateFile(localFile);

    try {
      const previewURL = URL.createObjectURL(localFile);
      setPreview({ url: previewURL, type: 'local' });
      setImageFile(localFile);

      const { success, result } = await getUploadedProductImageURL();

      if (success) {
        const { id, uploadURL } = result;
        const cloudflareUrl = `https://imagedelivery.net/UYdYeWsHCBBURfLH8Q-Ggw/${id}`;
        setUploadURL(uploadURL);
        setImageUrl(cloudflareUrl);
        onImageUrlChange?.(cloudflareUrl);
        console.log('Setting cloudflare URL:', cloudflareUrl);
      }
    } catch (error) {
      console.error('이미지 처리 중 에러가 발생했습니다.', error);
      setFileError('이미지 처리 중 에러가 발생했습니다.');
    }
  };

  // displayUrl 계산 로직
  const displayUrl = preview.url
    ? preview.type === 'cloudflare'
      ? getImageUrl(preview.url, 'public')
      : preview.url
    : '';

  return {
    preview,
    imageFile,
    fileError,
    uploadURL,
    handleImageChange,
    imageUrl,
    // 편의를 위한 computed 값 추가
    displayUrl,
  };
}
