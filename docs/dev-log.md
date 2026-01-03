# Development Log

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
