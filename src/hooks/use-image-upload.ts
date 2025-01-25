import { ChangeEvent, useState } from 'react';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants/constants';
import { getUploadedProductImageURL } from '@/app/actions/actions';
import { getImageUrl } from '@/lib/utils';

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
    setFileError('');

    if (!files || files.length === 0) {
      console.log('파일이 선택되지 않았습니다.');
      return;
    }

    const localFile = files[0];

    // 파일 접근 가능 여부 확인
    try {
      await localFile.slice(0, 1).arrayBuffer();
    } catch (e) {
      console.error(e);
      setFileError(
        '파일에 접근할 수 없습니다. 파일이 사용 가능한 상태인지 확인해주세요.'
      );
      return;
    }

    // 파일 타입 검증
    if (!ALLOWED_FILE_TYPES.includes(localFile.type)) {
      setFileError(
        '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP만 가능합니다.'
      );
      return;
    }

    // 파일 크기 검증
    if (localFile.size > MAX_FILE_SIZE) {
      setFileError('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

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
