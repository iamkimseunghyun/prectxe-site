// lib/route-config.ts

export type EntityType =
  | 'artwork'
  | 'artist'
  | 'event'
  | 'ticket'
  | 'project'
  | 'venue';

interface RouteConfig {
  path: string; // 라우팅 경로
  displayName: string; // UI에 표시될 이름
  schemaTable: string; // 데이터베이스 테이블 이름
}

export const ROUTE_CONFIG: Record<EntityType, RouteConfig> = {
  artwork: {
    path: 'artworks',
    displayName: '작품 소개',
    schemaTable: 'Artwork',
  },
  artist: {
    path: 'artists',
    displayName: '작가 소개',
    schemaTable: 'Artist',
  },
  event: {
    path: 'events',
    displayName: '이벤트',
    schemaTable: 'Event',
  },
  ticket: {
    path: 'tickets',
    displayName: '티켓',
    schemaTable: 'Ticket',
  },
  project: {
    path: 'projects',
    displayName: '프로젝트',
    schemaTable: 'Project',
  },
  venue: {
    path: 'venues',
    displayName: '공간',
    schemaTable: 'Venue',
  },
} as const;

// 유틸리티 함수들
export const getRoutePath = (entityType: EntityType) =>
  ROUTE_CONFIG[entityType].path;
export const getDisplayName = (entityType: EntityType) =>
  ROUTE_CONFIG[entityType].displayName;
export const getSchemaTable = (entityType: EntityType) =>
  ROUTE_CONFIG[entityType].schemaTable;

// 역방향 조회를 위한 유틸리티
export const getEntityTypeFromPath = (path: string): EntityType | undefined => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const entry = Object.entries(ROUTE_CONFIG).find(
    ([_, config]) => config.path === normalizedPath
  );
  return entry ? (entry[0] as EntityType) : undefined;
};
