import InstagramIcon from '@/components/icons/instagram';
import YoutubeIcon from '@/components/icons/youtube';

export const categories = [
  { value: 'exhibition', label: '전시' },
  { value: 'performance', label: '공연' },
  { value: 'festival', label: '페스티벌' },
  { value: 'workshop', label: '워크숍' },
] as const;

export const MAX_FILE_SIZE = 500 * 10240 * 10240; // 5MB
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

// Social Icons
export const socialIcons = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/prectxe/',
    icon: InstagramIcon,
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@prectxe',
    icon: YoutubeIcon,
  },
];

// eslint-disable-next-line no-control-regex
export const STRING_REGEX = /[\0\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;
