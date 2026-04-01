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
 * 안전장치: newImageUrls가 비어있으면 전체 삭제 방지
 */
export async function deleteRemovedImages(
  existingImages: { imageUrl: string }[],
  newImageUrls: string[]
) {
  if (existingImages.length > 0 && newImageUrls.length === 0) {
    console.warn(
      'deleteRemovedImages: newImageUrls가 비어있어 전체 삭제를 건너뜁니다.'
    );
    return;
  }
  const toDelete = existingImages
    .filter((img) => !newImageUrls.includes(img.imageUrl))
    .map((img) => extractImageId(img.imageUrl))
    .filter(Boolean);

  await Promise.allSettled(toDelete.map((id) => deleteCloudflareImage(id!)));
}

/**
 * 이미지 배열의 모든 이미지를 Cloudflare에서 삭제 (delete용)
 * 개별 이미지 삭제 실패해도 나머지 계속 진행
 */
export async function deleteAllImages(images: { imageUrl: string }[]) {
  await Promise.allSettled(
    images
      .map((img) => extractImageId(img.imageUrl))
      .filter(Boolean)
      .map((id) => deleteCloudflareImage(id!))
  );
}

function extractImageId(url: string) {
  const regex = /imagedelivery\.net\/[^/]+\/([^/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * HTML 본문에서 Cloudflare 이미지 URL을 모두 추출
 */
function extractImageIdsFromHtml(html: string): string[] {
  const regex = /imagedelivery\.net\/[^/]+\/([^/"'\s]+)/g;
  const ids: string[] = [];
  for (const match of html.matchAll(regex)) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

/**
 * 이전/이후 HTML을 비교하여 제거된 이미지를 Cloudflare에서 삭제
 */
export async function cleanupRemovedHtmlImages(
  oldHtml: string | null,
  newHtml: string | null
) {
  if (!oldHtml) return;
  const oldIds = extractImageIdsFromHtml(oldHtml);
  const newIds = newHtml ? extractImageIdsFromHtml(newHtml) : [];
  const toDelete = oldIds.filter((id) => !newIds.includes(id));
  await Promise.allSettled(toDelete.map((id) => deleteCloudflareImage(id)));
}

/**
 * HTML 본문 내 모든 Cloudflare 이미지를 삭제
 */
export async function deleteAllHtmlImages(html: string | null) {
  if (!html) return;
  const ids = extractImageIdsFromHtml(html);
  await Promise.allSettled(ids.map((id) => deleteCloudflareImage(id)));
}

// ─── Cloudflare Stream (Video) ─────────────────────

export async function getCloudflareVideoUploadUrl(maxDurationSeconds = 300) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGE_STREAM_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxDurationSeconds }),
      }
    );

    if (!response.ok) {
      console.error('Cloudflare Stream API Error:', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: `Stream upload URL 실패: ${response.status}`,
      };
    }

    const data = await response.json();
    const uid = data.result?.uid;
    const uploadURL = data.result?.uploadURL;
    return {
      success: true,
      uploadURL,
      videoId: uid,
      videoUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${uid}`,
    };
  } catch (error) {
    console.error('Cloudflare Stream API Request failed:', error);
    return { success: false, error: 'Stream API 요청 실패' };
  }
}

export async function deleteCloudflareVideo(videoId: string) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID}/stream/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGE_STREAM_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Cloudflare Stream Delete Error:', {
        status: response.status,
        statusText: response.statusText,
      });
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error('Cloudflare Stream Delete Error:', error);
    return { success: false };
  }
}

function extractVideoId(url: string | null): string | null {
  if (!url) return null;
  // cloudflarestream.com/{uid} 또는 watch.cloudflarestream.com/{uid}
  const regex = /cloudflarestream\.com\/([a-f0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ─── Cloudflare Images ─────────────────────────────

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

    // 404 = 이미 삭제됨 → 성공으로 처리
    if (response.status === 404) {
      return { success: true };
    }

    if (!response.ok) {
      console.error('Cloudflare Delete API Error:', {
        status: response.status,
        statusText: response.statusText,
      });
      return { success: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Cloudflare Delete API Error:', error);
    return { success: false };
  }
}
