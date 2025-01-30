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

export const uploadSingleImage = async (imageFile: File, uploadURL: string) => {
  if (imageFile) {
    const cloudFlareForm = new FormData();
    cloudFlareForm.append('file', imageFile);
    const response = await fetch(uploadURL, {
      method: 'POST',
      body: cloudFlareForm,
    });
    if (response.status !== 200) {
      throw new Error('Failed to upload main image');
    }
  }
};

export const uploadGalleryImages = async (
  previews: { preview: string; file: File | null; uploadURL: string }[]
) => {
  return Promise.all(
    previews.map(async (preview) => {
      const formData = new FormData();
      formData.append('file', preview.file!);
      const response = await fetch(preview.uploadURL, {
        method: 'POST',
        body: formData,
      });
      if (response.status !== 200) {
        throw new Error(`Failed to upload image}`);
      }
    })
  );
};
