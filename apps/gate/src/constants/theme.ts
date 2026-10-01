// 공연장(어두움)과 야외(밝음) 모두에서 읽히도록 어두운 배경 + 큰 대비를 쓴다
export const colors = {
  bg: '#000000',
  surface: '#141414',
  border: '#2a2a2a',
  text: '#ffffff',
  muted: '#9a9a9a',
  danger: '#ff5a5f',
  success: '#22c55e',
  warning: '#f5c542',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
