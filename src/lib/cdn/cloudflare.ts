'use server';

import { CLOUD_FLARE_UPLOAD_IMAGE_URL } from '@/lib/constants/constants';

export async function getUploadedProductImageURL() {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGE_STREAM_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Cloudflare API Error:', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: `Failed to get upload URL: ${response.status} ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Cloudflare API Request failed:', error);
    return { success: false, error };
  }
}

export async function getCloudflareImageUrl() {
  const { success, result } = await getUploadedProductImageURL();

  if (!success) {
    throw new Error('Failed to get upload URL');
  }

  return {
    uploadURL: result.uploadURL,
    imageUrl: `${CLOUD_FLARE_UPLOAD_IMAGE_URL}/${result.id}`,
  };
}

/**
 * 기존 이미지 중 새 목록에 없는 이미지를 Cloudflare에서 삭제 (update용)
 */
export async function deleteRemovedImages(
  existingImages: { imageUrl: string }[],
  newImageUrls: string[]
) {
  for (const img of existingImages) {
    if (!newImageUrls.includes(img.imageUrl)) {
      const imageId = extractImageId(img.imageUrl);
      if (imageId) {
        await deleteCloudflareImage(imageId);
      }
    }
  }
}

/**
 * 이미지 배열의 모든 이미지를 Cloudflare에서 삭제 (delete용)
 */
export async function deleteAllImages(images: { imageUrl: string }[]) {
  for (const img of images) {
    const imageId = extractImageId(img.imageUrl);
    if (imageId) {
      await deleteCloudflareImage(imageId);
    }
  }
}

function extractImageId(url: string) {
  const regex = /imagedelivery\.net\/[^/]+\/([^/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function deleteCloudflareImage(imageId: string) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGE_STREAM_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Cloudflare Delete API Error:', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: `Failed to delete upload URL: ${response.status} ${response.statusText}`,
      };
    }
    return await response.json();
  } catch (error) {
    console.error('Cloudflare Delete API Error:', error);
    return { success: false, error };
  }
}
