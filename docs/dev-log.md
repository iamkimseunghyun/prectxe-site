# Development Log

## 2026-01-05

### CLAUDE.md 개선
- 프로젝트 구조 및 모듈 아키텍처 상세 설명 추가
- 데이터베이스 모델 및 인증 시스템 문서화
- 이미지 업로드 아키텍처 (Cloudflare) 설명 추가
- 환경 변수, UI 레이아웃, 개발 워크플로우 문서화
- 핵심 기술 패턴 (Server Actions, TanStack Query, Zod) 추가

### 메인 페이지 리디자인

**모바일 반응형 개선** (`featured-hero-section.tsx`):
- 히어로 이미지 높이: `h-[60vh] md:h-[70vh]` (모바일에서 더 작게)
- 텍스트 크기: `text-2xl sm:text-3xl md:text-5xl` → `text-xl sm:text-2xl md:text-3xl`
- 패딩: `p-4 sm:p-6 md:p-12` 단계별 조정
- 네비게이션 링크: `text-xs sm:text-sm md:text-base` 반응형 적용

**미니멀 디자인 전환**:
- 데이터 쿼리 변경: `listPrograms()` → Prisma 직접 쿼리로 아티스트 정보 포함
- ProgramCredit을 통한 아티스트 정보 추출 및 표시
- 날짜/장소 정보 완전 제거
- 타이포그래피:
  - 제목: `font-serif font-light tracking-wide`
  - 아티스트: `font-sans font-light tracking-wider text-white/80`

**레이아웃 변경**:
- 텍스트 위치: 하단 → 정중앙 (`inset-0 flex items-center justify-center`)
- 텍스트 정렬: `text-center` 적용
- 배경 그라디언트 제거

**가독성 개선**:
- 블러 배경 박스 추가: `backdrop-blur-md bg-black/40`
- 부드러운 모서리: `rounded-xl`
- 반응형 패딩: `px-8 py-6 sm:px-12 sm:py-8`
- 어떤 배경 이미지에서도 텍스트 가독성 보장

**결과**: 갤러리 느낌의 미니멀하고 우아한 메인 페이지

### 저널 공개/비공개 토글 기능

**journal-form-view.tsx 수정**:
- 발행 상태 추적: `isPublished` state 추가 (초기값: `Boolean(initial?.publishedAt)`)
- 토글 핸들러 구현: `handlePublishToggle`
  - 공개 시: `publishedAt`을 현재 날짜로 설정
  - 비공개 시: `publishedAt`을 null로 설정
- UI 변경: 날짜 입력 필드를 체크박스 토글로 교체
  - 상태 표시: "공개됨" 또는 "비공개 (초안)"
  - 공개 상태일 때 발행일 표시

**기존 인프라 활용**:
- `listArticles()`: 이미 `publishedAt: { not: null }` 필터링으로 공개 글만 표시
- 관리자 뷰: `includeUnpublished: true` 옵션으로 모든 글 표시

**결과**: 초안 저장 및 공개/비공개 전환 기능 완성

---

## 2026-01-04

### Form Design Improvements
- **program-form-view.tsx**: Card 기반 섹션 구조 적용 (이전 세션에서 완료)
- **journal-form-view.tsx**: 동일한 Card 섹션 패턴 적용
  - 기본 정보, 콘텐츠, 커버 이미지, 태그 섹션으로 분리
  - 필수 필드 표시 (`*`) 추가

### ESLint + Prettier → Biome 마이그레이션
- **설치**: `@biomejs/biome` 추가
- **설정**: `biome.json` 생성 (스키마 버전 2.3.10)
  - Tailwind CSS 지원: `css.parser.tailwindDirectives: true`
  - 2-space indent, single quotes, ES5 trailing commas
  - 미사용 import/변수 warn, explicit any warn
- **삭제된 패키지** (10개):
  - eslint, eslint-config-next, eslint-config-prettier
  - eslint-plugin-react-hooks, @eslint/eslintrc
  - prettier, prettier-plugin-tailwindcss
  - @types/eslint, typescript-eslint
- **삭제된 파일**: `eslint.config.mjs`, `.prettierrc`
- **package.json 스크립트 업데이트**:
  - `lint` → `biome lint .`
  - `format` → `biome format --write .`
  - `check` → `biome check .`
- **자동 수정**: 146개 파일 포맷팅 적용

### 네비게이션 리디자인
- **기존**: 상단 고정 헤더 + 하단 푸터 (중복 네비게이션)
- **변경**:
  - 전통적인 헤더 제거
  - 관리자 전용 플로팅 헤더 (우상단, 로그인한 관리자만 표시)
  - `--header-height` CSS 변수 제거
  - `nav-bar.tsx` 삭제

**header.tsx 변경 내용**:
```tsx
// Before: 전체 네비게이션 바
// After: 관리자 전용 플로팅 버튼
<header className="fixed right-4 top-4 z-50">
  <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-4 py-2 text-sm backdrop-blur-sm">
    <Link href="/admin">Admin</Link>
    <span>{user?.username}</span>
    <button onClick={logout}>Logout</button>
  </div>
</header>
```

### GlobalSearch 플로팅 버튼
- **기존**: 헤더 내 검색 버튼
- **변경**: 우하단 플로팅 버튼 (`fixed bottom-6 right-6`)
  - 둥근 버튼 (`rounded-full h-12 w-12`)
  - 호버 시 스케일 효과
  - `⌘K` 단축키 유지
- **layout.tsx**: GlobalSearch 컴포넌트 추가

### 커밋
```
9c17ab4 chore: migrate to Biome, redesign navigation
153 files changed, 1132 insertions(+), 1829 deletions(-)
```

### 보류/검토 사항
- 홈페이지 하단 여백 → 현재 유지 (풀스크린 히어로 스타일)
- 캐러셀 vs 단일 이미지 → 현재 단일 이미지 유지

---

## 파일 변경 요약

### 신규 파일
- `biome.json`

### 삭제된 파일
- `.prettierrc`
- `eslint.config.mjs`
- `src/components/layout/nav/nav-bar.tsx`

### 주요 수정 파일
- `package.json` - Biome 스크립트, 패키지 정리
- `src/components/layout/header.tsx` - 관리자 전용 플로팅 헤더
- `src/app/layout.tsx` - GlobalSearch 추가, 헤더 패딩 제거
- `src/app/globals.css` - `--header-height` 변수 제거
- `src/modules/home/ui/components/global-search.tsx` - 플로팅 버튼
- `src/modules/home/ui/section/featured-hero-section.tsx` - min-h-screen
- `src/modules/journal/ui/views/journal-form-view.tsx` - Card 섹션 구조
