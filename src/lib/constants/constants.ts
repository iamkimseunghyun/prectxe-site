import { LucideMail } from 'lucide-react';
import InstagramIcon from '@/components/icons/instagram';
import YoutubeIcon from '@/components/icons/youtube';

export const categories = [
  { value: 'exhibition', label: '전시' },
  { value: 'performance', label: '공연' },
  { value: 'festival', label: '페스티벌' },
  { value: 'workshop', label: '워크숍' },
] as const;

export const MAX_FILE_SIZE = 50 * 10240 * 10240; // 50MB
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
  {
    name: 'Email',
    href: 'mailto:info@laaf.kr>',
    icon: LucideMail,
  },
];

// eslint-disable-next-line no-control-regex
export const STRING_REGEX = /[\0\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;

// 페이지네이션 관련 상수
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 6, // 기본 페이지 크기
  ARTISTS_PAGE_SIZE: 6, // 아티스트 페이지 크기
  ARTWORKS_PAGE_SIZE: 6, // 작품 페이지 크기
  EVENTS_PAGE_SIZE: 6, // 이벤트 페이지 크기
};

// 캐시 관련 상수 (시간은 초 단위)
export const CACHE_TIMES = {
  ARTISTS_LIST: 3600, // 아티스트 목록 (1시간)
  ARTIST_DETAIL: 7200, // 아티스트 상세 (2시간)
  ARTWORKS_LIST: 3600, // 작품 목록 (1시간)
  ARTWORK_DETAIL: 7200, // 작품 상세 (2시간)
  EVENTS_LIST: 1800, // 이벤트 목록 (30분)
  EVENT_DETAIL: 3600, // 이벤트 상세 (1시간)
  PROJECTS_LIST: 3600, // 프로젝트 목록 (1시간)
  PROJECT_DETAIL: 7200, // 프로젝트 상세 (2시간)
  PROGRAMS_LIST: 1800, // 프로그램 목록 (30분)
  PROGRAM_DETAIL: 3600, // 프로그램 상세 (1시간)
};

// 공통 선택 필드 (Prisma select)
export const SELECT_FIELDS = {
  SIMPLE_ARTIST: {
    id: true,
    name: true,
    nameKr: true,
    mainImageUrl: true,
  },
  SIMPLE_ARTWORK: {
    id: true,
    title: true,
    mainImageUrl: true,
  },
};

// API 관련 상수
export const API = {
  REVALIDATE_ON_FOCUS: false, // 포커스 시 재검증 여부
  RETRY_COUNT: 3, // 재시도 횟수
  RETRY_DELAY: 1000, // 재시도 대기 시간 (ms)
};
