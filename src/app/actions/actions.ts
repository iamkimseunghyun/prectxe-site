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
      throw new Error('Failed to get upload URL');
    }

    const data = await response.json();
    return data;
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

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;

// Cloudflare Direct Upload URL 가져오기 (서버)
export async function getCloudflareUploadUrl() {
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
      throw new Error('Failed to get upload URL');
    }

    const data = await response.json();
    return {
      success: true,
      uploadURL: data.result.uploadURL,
      imageUrl: `${CLOUDFLARE_BASE_URL}/${data.result.id}`,
    };
  } catch (error) {
    console.error('Failed to get Cloudflare upload URL:', error);
    return {
      success: false,
      error: 'Failed to get upload URL',
    };
  }
}
