export const categories = [
  { value: 'exhibition', label: '전시' },
  { value: 'performance', label: '공연' },
  { value: 'festival', label: '페스티벌' },
  { value: 'workshop', label: '워크숍' },
] as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

// Cloud Flare Upload Image Url
export const CLOUD_FLARE_UPLOAD_IMAGE_URL =
  'https://imagedelivery.net/UYdYeWsHCBBURfLH8Q-Ggw';
