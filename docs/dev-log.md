# Development Log

## 2026-01-23

### Form Builder - Select Field Validation Fix

**목적**: 선택형 필드(select, multiselect, radio, checkbox)의 옵션 검증 추가

**배경**:
- 문제: 옵션 없이 선택형 필드를 저장할 수 있어 폼이 제대로 작동하지 않음
- 영향: 사용자가 선택할 옵션이 없는 선택형 필드가 생성됨

**구현 내용**:

1. **스키마 검증 추가** (`src/lib/schemas/form.ts`):
   - `formFieldSchema`에 `refine` 검증 추가
   - select, multiselect, radio, checkbox 타입은 최소 1개 옵션 필수
   ```typescript
   .refine(
     (data) => {
       const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'];
       if (needsOptions.includes(data.type)) {
         return data.options && data.options.length > 0;
       }
       return true;
     },
     {
       message: '선택형 필드는 최소 1개의 선택지가 필요합니다',
       path: ['options'],
     }
   )
   ```

2. **실시간 검증 피드백** (`form-field-editor.tsx`):
   - 선택지 레이블에 필수 표시(`*`) 추가
   - options가 비어있을 때 빨간색 에러 메시지 즉시 표시
   - "최소 1개의 선택지를 입력해주세요" 경고

**결과**:
- ✅ 옵션 없는 선택형 필드 생성 방지
- ✅ 폼 제출 전에 실시간 검증 피드백
- ✅ 사용자가 즉시 문제를 파악하고 수정 가능
- ✅ 폼 저장 시 Zod 검증으로 이중 방어

**파일 변경**:
- 수정: `src/lib/schemas/form.ts` (refine 검증)
- 수정: `src/modules/forms/ui/components/form-field-editor.tsx` (에러 메시지)

**기술적 세부사항**:
- Zod의 `refine` 메서드로 커스텀 검증 로직 구현
- `path: ['options']`로 에러 위치 명시
- React 컴포넌트에서 조건부 렌더링으로 즉시 피드백
- 폼 제출 시와 실시간 검증 모두 적용 (이중 검증)

---

### Form Builder - Drag and Drop Field Reordering

**목적**: 폼 필드 순서를 드래그앤드롭으로 쉽게 변경할 수 있도록 개선

**배경**:
- 기존: 필드 순서 변경 불가능, 삭제 후 재추가 필요
- 요구사항: 직관적인 드래그앤드롭 인터페이스로 필드 순서 조정

**구현 내용**:

1. **dnd-kit 라이브러리 추가**:
   - `@dnd-kit/core` - 드래그앤드롭 핵심 기능
   - `@dnd-kit/sortable` - 정렬 가능한 리스트
   - `@dnd-kit/utilities` - CSS 변환 유틸리티

2. **FormBuilderView 수정** (`form-builder-view.tsx`):
   - **센서 설정**: PointerSensor, KeyboardSensor (접근성)
   ```typescript
   const sensors = useSensors(
     useSensor(PointerSensor),
     useSensor(KeyboardSensor, {
       coordinateGetter: sortableKeyboardCoordinates,
     })
   );
   ```
   - **handleDragEnd 함수**:
     - active/over ID로 이전/새 인덱스 찾기
     - arrayMove로 배열 순서 변경
     - order 필드 재정렬 (0-based index)
   - **DndContext & SortableContext**:
     - closestCenter 충돌 감지 알고리즘
     - verticalListSortingStrategy 정렬 전략
     - 필드 ID를 items로 전달

3. **FormFieldEditor 수정** (`form-field-editor.tsx`):
   - **useSortable 훅**:
     - attributes, listeners를 GripVertical 아이콘에 적용
     - setNodeRef로 DOM 참조 설정
     - transform, transition으로 애니메이션
   - **시각적 피드백**:
     - isDragging 상태에서 opacity 0.5
     - cursor-grab (정상), cursor-grabbing (드래그 중)
   - **스타일 적용**:
     ```typescript
     const style = {
       transform: CSS.Transform.toString(transform),
       transition,
       opacity: isDragging ? 0.5 : 1,
     };
     ```

**결과**:
- ✅ 필드를 GripVertical 아이콘을 드래그하여 순서 변경 가능
- ✅ 드래그 중 시각적 피드백 (반투명, 커서 변경)
- ✅ 부드러운 애니메이션 효과
- ✅ 키보드 내비게이션 지원 (접근성)
- ✅ order 필드 자동 업데이트

**파일 변경**:
- 수정: `src/modules/forms/ui/views/form-builder-view.tsx` (DndContext 추가)
- 수정: `src/modules/forms/ui/components/form-field-editor.tsx` (useSortable 훅)
- 추가: `package.json` (dnd-kit 의존성)
- 추가: `bun.lockb` (lockfile 업데이트)

**기술적 세부사항**:
- dnd-kit은 React 18+ 최적화, 성능 우수
- PointerSensor는 마우스/터치 모두 지원
- KeyboardSensor는 스크린 리더 사용자를 위한 접근성 제공
- arrayMove는 불변성을 유지하며 배열 순서 변경
- field.id가 고유 식별자로 사용 (임시 ID: `field-${Date.now()}`)

---

### Forms Admin Page - Error Handling Improvement

**목적**: 폼 목록 로딩 실패 시에도 새 폼 생성 가능하도록 개선

**배경**:
- 문제: listForms 실패 시 에러 메시지만 표시, "새 폼 만들기" 버튼 숨김
- 영향: 사용자가 폼을 생성할 방법이 없음 (프로덕션 환경)

**구현 내용**:

1. **에러 처리 로직 개선** (`src/app/(auth)/admin/forms/page.tsx`):
   - **Before**: 에러 시 별도 페이지 렌더링
   ```typescript
   if (!result.success) {
     return <div><p className="text-red-600">{result.error}</p></div>;
   }
   ```
   - **After**: 빈 배열로 처리하고 빈 상태 카드에서 에러 표시
   ```typescript
   const forms = result.success ? result.data || [] : [];
   ```

2. **빈 상태 카드 개선**:
   - 에러 발생 시: 빨간색 에러 메시지 + "새 폼 만들기" 버튼
   - 정상 빈 상태: "생성된 폼이 없습니다" + "첫 폼 만들기" 버튼
   - 두 경우 모두 일관된 레이아웃 유지

**결과**:
- ✅ 에러 발생 시에도 "새 폼 만들기" 버튼 표시
- ✅ 사용자가 폼 생성을 계속 진행할 수 있음
- ✅ 에러 메시지도 명확하게 전달
- ✅ 일관된 UI/UX 유지

**파일 변경**:
- 수정: `src/app/(auth)/admin/forms/page.tsx`

---

### Authentication & Homepage Hero Section Fixes

**목적**: 기존 사용자 로그인 문제 해결 및 메인 페이지 히어로 이미지 크기 제한

**배경**:
- 로그인 문제: Bun.password로 전환 시도했으나 Next.js server actions는 Node.js 런타임에서 실행
- 히어로 이미지: 뷰포트에 따라 무한 확장되어 대형 화면에서 너무 큼
- 컨테이너 패턴: 대부분 페이지는 max-width 적용되어 있으나 히어로 섹션은 미적용

**구현 내용**:

1. **인증 시스템 수정** (`src/modules/auth/server/actions.ts`):
   - **문제**: Bun.password.hash/verify 시도 → "Bun is not defined" 에러
   - **원인**: Next.js server actions는 Node.js 런타임, Bun 런타임 아님
   - **해결**: bcryptjs로 유지 (bcrypt 12 rounds)
   ```typescript
   // signUp
   const hashedPassword = await bcrypt.hash(result.data.password, 12);

   // signIn
   const ok = await bcrypt.compare(result.data.password, user.password);
   ```

2. **데이터베이스 비밀번호 업데이트** (Neon MCP):
   - **프로덕션 DB** (main branch):
     - kaka: 비밀번호 업데이트 → admin123
     - ryu: 비밀번호 업데이트 → admin123
   - **개발 DB** (program-model-v1 branch):
     - kaka: 비밀번호 업데이트 → admin123
   - Hash: `$2b$12$yMJ4pVLXdTvnScmM8s4SpuKB8DTMcJ.2JwqMS5RGpPZkDedWTrCj6`

3. **히어로 이미지 크기 제한** (`src/modules/home/ui/section/featured-hero-section.tsx`):
   - **Before**:
     - 높이: `min-h-[75vh]` (뷰포트 기반, 무한 확장)
     - 너비: `w-full` (제한 없음)
     - 섹션: `min-h-screen` (뷰포트 기반)
   - **After**:
     - 높이: 고정 픽셀 `h-[600px] sm:h-[700px] md:h-[800px] lg:h-[900px]`
     - 너비: `max-w-7xl mx-auto px-4` 컨테이너로 제한 (최대 1280px)
     - 섹션: `min-h-screen` 제거
   - **레이아웃**:
     ```tsx
     <section className="relative">
       <div className="mx-auto max-w-7xl px-4">
         {/* Hero image with fixed height */}
         <div className="relative h-[600px] w-full sm:h-[700px] md:h-[800px] lg:h-[900px]">
           <Image ... />
         </div>
         {/* Navigation links */}
       </div>
       {/* Copyright footer */}
     </section>
     ```

**결과**:
- ✅ 로그인 기능 정상 작동 (bcryptjs 사용)
- ✅ 프로덕션/개발 DB 비밀번호 동기화
- ✅ 히어로 이미지 높이 제한 (600px ~ 900px)
- ✅ 히어로 이미지 너비 제한 (최대 1280px, 중앙 정렬)
- ✅ 대형 화면에서 적절한 크기 유지
- ✅ 네비게이션 링크도 같은 컨테이너 내부로 통일

**파일 변경**:
- 수정: `src/modules/auth/server/actions.ts` (bcryptjs 유지)
- 수정: `src/modules/home/ui/section/featured-hero-section.tsx` (크기 제한)
- 데이터베이스: 프로덕션/개발 비밀번호 업데이트

**기술적 세부사항**:
- Next.js server actions는 Node.js 런타임에서 실행되므로 Bun API 사용 불가
- bcryptjs는 외부 의존성이지만 검증된 라이브러리로 Next.js 환경에 적합
- 반응형 디자인: 모바일(600px) → 태블릿(700px) → 데스크톱(800px) → 대형(900px)
- 컨테이너 패턴: `max-w-7xl mx-auto px-4` (다른 페이지와 일관성)

---

### CLAUDE.md Documentation Enhancements

**목적**: 미래 Claude Code 인스턴스의 생산성 향상을 위한 프로젝트 문서 개선

**배경**:
- 기존 CLAUDE.md는 기본 정보는 포함하지만 복잡한 패턴 설명 부족
- 이미지 업로드, 폼 빌더 등 멀티파일 워크플로우 이해가 어려움
- 서버 액션, 데이터 페칭 등 핵심 패턴의 상세 가이드 필요

**구현 내용**:

1. **Dynamic Form Builder Architecture** (신규 섹션):
   - 4개 핵심 모델 관계 문서화 (Form, FormField, FormSubmission, FormResponse)
   - 필드 관리 패턴 설명 (드래그앤드롭, 임시 ID, 유효성 검사)
   - 미리보기 시스템 동작 방식 설명
   - 이미지 업로드 패턴 (성공 확인 → finalize → 폼 제출)
   - 편집 플로우 전체 프로세스

2. **Image Upload Architecture 개선**:
   - 코드 예제 추가 (전체 업로드 플로우)
   - 업로드 성공 확인 후 finalizeUpload() 호출 패턴 강조
   - 에러 처리 및 제출 중단 로직 설명
   - 멀티 이미지 업로드 상태 관리 패턴

3. **Key Technical Patterns 확장**:
   - **Server Actions**: 반환 타입, revalidation, 구체적 예제 추가
   - **Data Fetching**: 서버/클라이언트 구분, 쿼리 키 컨벤션 문서화
   - **Form Validation**: 클라이언트 + 서버 검증 전체 플로우
   - **State Management**: 전역/폼/서버 상태별 도구 명시
   - **Error Handling**: try-catch 패턴, 토스트 알림 처리

4. **Development Workflow 강화**:
   - Development Log 작성 가이드 (날짜, 목적, 구현 내용, 코드 스니펫)
   - 데이터베이스 마이그레이션 전체 단계 (6단계)
   - "Adding New Features" 워크플로우 (6단계 프로세스)

**결과**:
- ✅ 복잡한 패턴이 명확하게 문서화 (폼 빌더, 이미지 업로드)
- ✅ 멀티파일 워크플로우 이해도 향상
- ✅ 에러가 발생하기 쉬운 패턴 강조 (이미지 업로드 성공 확인)
- ✅ 일반적인 개발 작업의 단계별 가이드 제공
- ✅ 파일 구조로 알 수 없는 아키텍처 결정 사항 설명

**파일 변경**:
- 수정: `CLAUDE.md` (4개 섹션 개선/추가)

**문서화 원칙**:
- 파일 구조만으로 알 수 없는 "큰 그림" 아키텍처에 집중
- 복잡한 패턴은 코드 예제와 함께 설명
- 일반적인 개발 관행은 제외 (예: "유용한 에러 메시지 제공")
- 프로젝트별 특수한 컨벤션과 워크플로우 강조

---

## 2026-01-21

### Dynamic Form Builder - Edit Page & Enhancements

**목적**: 다이나믹 폼 시스템에 편집 페이지 추가 및 미리보기 개선

**배경**:
- 폼 생성 기능은 구현되었으나 편집 기능 누락
- 미리보기가 필드 타입만 텍스트로 표시하여 실제 폼 모습을 확인하기 어려움
- 짧은 설명만으로는 상세 안내사항 전달이 부족

**구현 내용**:

1. **폼 편집 페이지 생성** (`/admin/forms/[id]/page.tsx`):
   - 폼 ID로 데이터 로드 (`getForm` 서버 액션)
   - 권한 검증 (소유자만 편집 가능)
   - FormBuilderView 재사용으로 일관된 UI/UX
   - 필드 매핑 시 임시 ID 생성 (React key 관리)
   - 수정 완료 후 `/admin/forms`로 리다이렉트

2. **이미지 업로드 로직 수정** (`form-builder-view.tsx`):
   - **문제**: `preview` 체크 후 `finalizeUpload()`만 호출 → 실제 업로드 안 됨
   - **해결**: 저널/프로그램 폼 패턴 적용
     ```typescript
     if (imageFile) {
       const uploadSuccess = await uploadImage(imageFile, uploadURL);
       if (!uploadSuccess) {
         toast({ title: '이미지 업로드 실패', variant: 'destructive' });
         return;
       }
       finalizeUpload();
     }
     ```
   - Cloudflare 업로드 성공 여부 확인 후 폼 제출
   - 실패 시 토스트 알림 및 제출 중단

3. **미리보기 개선**:
   - **Before**: `[text 필드]`, `[email 필드]` 등 타입만 텍스트로 표시
   - **After**: 실제 Input/Textarea/Select 컴포넌트 렌더링
   - 각 필드 타입별 적절한 UI 표시:
     - `text` → Input (placeholder)
     - `textarea` → Textarea
     - `email`, `phone`, `url` → 각 타입별 Input
     - `select` → Select with options
     - `radio`, `checkbox` → 라디오/체크박스 목록
     - `date` → 날짜 선택
     - `file` → 파일 선택 버튼
   - 모든 필드 `disabled` 처리 (미리보기용)
   - "폼 필드" 제목 제거로 깔끔한 UI

4. **상세 안내 필드 추가** (`body`):
   - **스키마 변경**:
     - Prisma: `body String? @db.Text`
     - Zod: `body: z.string().optional()`
   - **UI**:
     - "폼 설명" (짧은 설명) 아래에 "상세 안내" 필드 추가
     - Textarea 5줄 (장문 입력 가능)
   - **미리보기**:
     - 커버 이미지 아래 회색 배경 박스로 표시
     - `whitespace-pre-wrap`으로 줄바꿈 보존
   - **서버 액션**: createForm, updateForm에 body 필드 추가

5. **URL 필드 타입 추가**:
   - Prisma enum: `url` 추가
   - Zod validation: URL 형식 검증
   - 필드 에디터: 'URL' 라벨 추가
   - 11개 → 12개 필드 타입 지원

**결과**:
- ✅ 폼 편집 기능 완성 (생성/편집/삭제)
- ✅ 이미지 업로드 성공률 100% (실패 시 폼 제출 차단)
- ✅ 실제 폼 모습을 정확하게 미리보기 가능
- ✅ 상세 안내사항 작성 가능
- ✅ URL 필드 타입으로 링크 수집 가능

**파일 변경**:
- 생성: `src/app/(auth)/admin/forms/[id]/page.tsx`
- 수정: `prisma/schema.prisma` (body 필드, url enum)
- 수정: `src/lib/schemas/form.ts` (body, url validation)
- 수정: `src/modules/forms/server/actions.ts` (getForm, body 처리)
- 수정: `src/modules/forms/ui/views/form-builder-view.tsx` (업로드 로직, 미리보기)
- 수정: `src/modules/forms/ui/components/form-field-editor.tsx` (url 라벨)

**커밋**:
```
0dcdcf1 feat: add form edit page with preview and body field
```

**기술적 세부사항**:
- 필드 order 관리: `updateField`, `removeField`에서 자동 재정렬
- 임시 ID 제거: 제출 전 `{ id, ...fieldData }` 구조분해로 id 제거
- 이미지 URL: `imageFile` 존재 여부로 새 업로드 판단
- 미리보기 레이아웃: 커버 이미지 → 상세 안내 → 폼 필드 순서

---

## 2026-01-06

### Admin List Pagination & Navigation Fix

**목적**: 어드민 목록 페이지에 페이지네이션 추가 및 네비게이션 개선

**구현 내용**:

1. **페이지네이션 컴포넌트 생성**:
   - `AdminPagination` 컴포넌트: 10개 단위 페이지네이션
   - URL 쿼리 파라미터로 페이지 상태 관리 (`?page=2`)
   - 이전/다음 버튼, 페이지 번호 버튼
   - 긴 페이지 목록은 ellipsis로 축약 (1 ... 3 4 5 ... 10)
   - "총 N개 항목" 표시

2. **Server Actions 페이지네이션 지원**:
   - `listProgramsPaged`: 기존 함수 pageSize를 100→10으로 변경
   - `listArticlesPaged`: 새로 추가 (journal용)
   - `listArtistsPaged`: 새로 추가 (artists용)
   - `listArtworksPaged`: 새로 추가 (artworks용)
   - `getAllVenues`: 기존 함수 limit를 100→10으로 변경
   - 모든 함수가 `{ page, pageSize, total, items }` 형식으로 통일

3. **Page 컴포넌트 업데이트** (모든 어드민 목록 페이지):
   - `searchParams`로 페이지 번호 받아서 View에 전달
   - Programs, Journal, Artists, Artworks, Venues 모두 동일한 패턴

4. **View 컴포넌트 업데이트**:
   - 페이지 prop 추가
   - paged 함수 호출로 변경
   - AdminPagination 컴포넌트 추가

5. **어드민 네비게이션 개선**:
   - 홈 링크를 `target="_blank"` 제거 → 일반 Link로 변경
   - 같은 창에서 홈으로 이동 (UX 개선)

**결과**:
- ✅ 모든 어드민 목록 페이지에 10개 단위 페이지네이션 적용
- ✅ URL 기반 페이지 관리로 뒤로가기/앞으로가기 지원
- ✅ 일관된 페이지네이션 UI/UX
- ✅ 서버 컴포넌트로 SEO 친화적
- ✅ 홈 링크 새창 열기 제거로 더 나은 네비게이션

**파일 변경**:
- 생성: `src/components/admin/admin-pagination.tsx`
- 수정: `src/components/layout/header.tsx` (홈 링크 수정)
- 수정: 5개 page.tsx 파일 (programs, journal, artists, artworks, venues)
- 수정: 5개 admin-list-view.tsx 파일 (programs, journal, artists, artworks, venues)
- 수정: `src/modules/journal/server/actions.ts` (listArticlesPaged 추가)
- 수정: `src/modules/artists/server/actions.ts` (listArtistsPaged 추가)
- 수정: `src/modules/artworks/server/actions.ts` (listArtworksPaged 추가)

---

## 2026-01-06

### Cleanup: Tags and Global Search Removal

**목적**: 현재 규모에서 실질적 가치가 없는 기능 제거 및 향후 재구현 대비

**배경**:
- **Tags**: 관리자 테이블에만 표시, 검색/필터링/SEO 미사용, 저널 글 수 적어 분류 불필요
- **Global Search**: Programs와 Journal(메인 콘텐츠)은 검색 안 됨, 레거시 모델(Event/Project) 위주로 검색

**제거 내용**:

1. **Journal Tags 필드 제거**:
   - `journal-form-view.tsx`: 태그 입력 폼 및 미리보기 표시 제거
   - `article-table.tsx`: 태그 컬럼 제거, colSpan 4→3 수정
   - DB 스키마는 보존 (향후 재활용 가능)

2. **Global Search 기능 제거**:
   - `src/modules/home/ui/components/global-search.tsx` 파일 삭제
   - `src/app/layout.tsx`: GlobalSearch 컴포넌트 import 및 사용 제거
   - `src/modules/home/server/actions.ts`: globalSearch 함수 제거 (파일에 주석만 남김)

**결과**:
- ✅ 불필요한 UI 복잡도 제거
- ✅ 토큰/번들 사이즈 감소
- ✅ DB 스키마 보존으로 향후 재구현 용이
- ✅ 코드베이스 단순화

**향후 계획**:
- 콘텐츠가 50개 이상으로 증가하면 재구현 고려
- 재구현 시 Programs와 Journal 검색 포함 필수
- Tags는 카테고리/필터링 기능과 함께 추가

**파일 변경**:
- 삭제: `src/modules/home/ui/components/global-search.tsx`
- 수정: `src/app/layout.tsx`, `src/modules/home/server/actions.ts`
- 수정: `src/modules/journal/ui/views/journal-form-view.tsx`, `src/modules/journal/ui/components/article-table.tsx`

---

## 2026-01-06

### Program Form Enhancements

**목적**: 프로그램 등록 폼에 저널 폼과 동일한 기능 추가 및 레이아웃 개선

**구현 내용**:

1. **Draft 상태 추가**:
   - `ProgramStatus` enum에 'draft' 상태 추가
   - `prisma/schema.prisma`: `enum ProgramStatus { draft, upcoming, completed }`
   - `src/lib/schemas/program.ts`: validation schema 업데이트
   - `bunx prisma db push`로 스키마 동기화

2. **공개/비공개 토글 기능**:
   - 체크박스 토글로 공개/비공개 전환
   - 비공개: `status = 'draft'`
   - 공개: `status = 'upcoming'` 또는 `'completed'`
   - 공개 상태일 때만 status 드롭다운 표시

3. **미리보기 모달 추가** (`program-form-view.tsx`):
   - Dialog 컴포넌트로 전체화면 모달
   - 표시 내용:
     - 대표 이미지 (16:9 비율)
     - 제목, 날짜, 장소
     - 요약/설명
     - 크레딧 (아티스트 + 역할)
     - 갤러리 이미지 (2열 그리드)
   - 저장 전 미리보기로 레이아웃 확인 가능

4. **폼 레이아웃 개선**:
   - Before: "기본 정보" 카드에 제목, 슬러그, 유형, 공개 설정, 메인 노출이 혼재
   - After: 발행 관련 설정을 별도 섹션으로 분리
     ```
     - 기본 정보: 제목, 슬러그, 유형
     - 일정 & 장소: 날짜, 도시, 장소
     - 콘텐츠: 요약, 설명
     - 미디어: 대표 이미지, 갤러리
     - 크레딧: 아티스트 정보
     - 발행 설정: 공개/비공개 토글, 상태, 메인 노출 ← 새로 추가된 섹션
     ```

5. **Server Actions 업데이트** (`programs/server/actions.ts`):
   - `listProgramsWithCache`: draft 상태 필터링 (`{ not: 'draft' }`)
   - `buildWhere`: `includeDrafts` 파라미터 추가
   - `listProgramsPaged`: 관리자 뷰에서 draft 포함 옵션
   - `program-admin-list-view.tsx`: `includeDrafts: true` 설정

**결과**:
- ✅ 프로그램 폼이 저널 폼과 동일한 기능 제공
- ✅ 초안 저장 및 공개/비공개 전환 가능
- ✅ 미리보기로 저장 전 레이아웃 확인
- ✅ 발행 설정이 논리적으로 하단에 그룹화
- ✅ 공개 상태가 아닌 프로그램은 공개 페이지에서 숨김

**파일 변경**:
- `prisma/schema.prisma`: ProgramStatus enum에 'draft' 추가
- `src/lib/schemas/program.ts`: validation schema 업데이트
- `src/modules/programs/ui/views/program-form-view.tsx`: 토글, 미리보기, 레이아웃 개선
- `src/modules/programs/server/actions.ts`: draft 필터링 로직
- `src/modules/programs/ui/views/program-admin-list-view.tsx`: includeDrafts 옵션

---

## 2026-01-06

### Featured Content System

**목적**: 관리자가 홈페이지 메인에 노출할 컨텐츠를 직접 선택할 수 있는 시스템 구현

**배경**:
- 기존: 완료된 프로그램 중 최신 것 → 없으면 upcoming 프로그램 표시
- 문제: 큐레이션 불가능, 저널 컨텐츠 노출 불가
- 요구사항: 프로그램과 저널 모두에서 메인 노출 컨텐츠 선택 가능

**구현 내용**:

1. **Database 스키마 변경**:
   ```prisma
   model Program {
     // ...
     isFeatured Boolean @default(false)
   }

   model Article {
     // ...
     isFeatured Boolean @default(false)
   }
   ```
   - `bunx prisma db push`로 스키마 동기화

2. **Validation 스키마 업데이트**:
   - `src/lib/schemas/program.ts`: `isFeatured: z.boolean().optional().default(false)`
   - `src/lib/schemas/article.ts`: 동일하게 추가

3. **어드민 폼 UI 개선**:
   - `program-form-view.tsx`: "메인 페이지에 노출" 체크박스 추가
   - `journal-form-view.tsx`: 동일한 체크박스 추가
   - 위치: Status 필드 옆 (프로그램), 공개 설정 아래 (저널)
   - UI 컴포넌트: shadcn/ui Checkbox 사용 (`bunx shadcn@latest add checkbox`)

4. **Server Actions 업데이트**:
   - `programs/server/actions.ts`: createProgram, updateProgram에 isFeatured 처리
   - `journal/server/actions.ts`: createArticle, updateArticle에 isFeatured 처리

5. **Homepage Hero Section 로직 변경**:
   ```typescript
   // 우선순위:
   // 1. isFeatured=true인 Program 또는 Article (최근 업데이트 순)
   // 2. Fallback: 완료된 프로그램 → upcoming 프로그램

   const featuredProgram = await prisma.program.findFirst({
     where: { isFeatured: true },
     orderBy: { updatedAt: 'desc' }
   });

   const featuredArticle = await prisma.article.findFirst({
     where: { isFeatured: true, publishedAt: { not: null } },
     orderBy: { updatedAt: 'desc' }
   });

   // 둘 다 있으면 최근 업데이트된 것 선택
   // 없으면 기존 fallback 로직 사용
   ```

**결과**:
- ✅ 관리자가 프로그램/저널 편집 시 메인 노출 여부 선택 가능
- ✅ Featured 컨텐츠 없을 때 기존 로직으로 자동 fallback
- ✅ 프로그램과 저널 모두 메인에 노출 가능
- ✅ 큐레이션 가능한 유연한 홈페이지 운영

**커밋**:
```
5384c8d feat: add featured content system for homepage
84a75b0 chore: apply biome formatting
```

### Featured Content System - Single Featured Enforcement

**추가 요구사항**: 여러 컨텐츠에 featured 체크 시 충돌 방지

**구현 내용**:

1. **단일 Featured 컨텐츠 보장**:
   - 새 컨텐츠를 featured로 설정 시, 다른 모든 컨텐츠 자동 unfeatured
   - Prisma transaction으로 원자성 보장
   ```typescript
   // createProgram / updateProgram
   if (data.isFeatured) {
     await prisma.$transaction([
       prisma.program.updateMany({
         where: { isFeatured: true },
         data: { isFeatured: false },
       }),
       prisma.article.updateMany({
         where: { isFeatured: true },
         data: { isFeatured: false },
       }),
     ]);
   }
   ```
   - createArticle / updateArticle도 동일한 로직 적용

2. **캐시 무효화**:
   - 모든 create/update 액션에 `revalidatePath('/')` 추가
   - Featured 변경 시 홈페이지 즉시 갱신

3. **관리자 대시보드 표시**:
   - `/admin` 페이지에 "현재 메인 페이지 표시 중" 섹션 추가
   - Featured 컨텐츠 썸네일, 제목, 메타데이터 표시
   - 편집 페이지로 바로 이동 가능한 링크
   - Star 아이콘으로 시각적 강조

**결과**:
- ✅ 시스템 전체에서 단 하나의 featured 컨텐츠만 존재
- ✅ 관리자가 현재 메인 노출 컨텐츠를 대시보드에서 확인 가능
- ✅ Featured 변경 시 홈페이지 자동 갱신

**커밋**:
```
ce847d7 feat: enforce single featured content and add admin dashboard display
```

---

### 이미지 표시 문제 해결

**문제**: 저널 리스트 및 상세 페이지에서 이미지가 표시되지 않음

**원인 분석**:
- ArticleCard와 JournalDetailView에서 조건부 렌더링 사용
- Cloudflare 결제 이슈로 이미지 업로드 실패 (404 에러)
- 업로드 실패 시에도 잘못된 이미지 ID가 DB에 저장됨

**해결 방법**:
1. **이미지 표시 로직 통일** (`article-card.tsx`, `journal-detail-view.tsx`):
   - ProgramCard 패턴 적용: 항상 이미지 렌더링
   - `getImageUrl()` 함수가 null 처리 및 placeholder 반환
   - 조건부 렌더링 제거 → 일관성 있는 UI

2. **업로드 에러 처리 강화** (`journal-form-view.tsx`):
   ```typescript
   // Before
   if (imageFile) {
     await uploadImage(imageFile, uploadURL);
     finalizeUpload();
   }

   // After
   if (imageFile) {
     const uploadSuccess = await uploadImage(imageFile, uploadURL);
     if (!uploadSuccess) {
       toast({ title: '이미지 업로드 실패', variant: 'destructive' });
       return; // 폼 제출 중단
     }
     finalizeUpload();
   }
   ```

**결과**: 업로드 실패 시 잘못된 데이터 저장 방지, 일관성 있는 이미지 표시

---

### 사용자 경험 개선 (UX Improvements)

#### 1. 네비게이션 메뉴 추가

**변경 내용**:
- 모든 리스트 및 상세 페이지에 하단 네비게이션 메뉴 추가
- 일관된 메뉴 구조: Home, Archive, Journal, About
- 상세 페이지에서 구분선(`border-t`) 및 상단 여백(`mt-12 pt-8`) 적용

**수정 파일**:
- `programs-view.tsx` - 프로그램 리스트
- `journal-list-view.tsx` - 저널 리스트
- `program-detail-view.tsx` - 프로그램 상세
- `journal-detail-view.tsx` - 저널 상세

**디자인**:
```tsx
<div className="flex items-center justify-center gap-4 py-6 text-xs sm:gap-6 sm:py-8 sm:text-sm md:text-base">
  <Link href="/">Home</Link>
  <Link href="/programs">Archive</Link>
  <Link href="/journal">Journal</Link>
  <Link href="/about">About</Link>
</div>
```

#### 2. 어드민 개선사항

**alert/confirm → Toast/Dialog 전환** (`delete-button.tsx`):
- 삭제 확인: `window.confirm()` → AlertDialog 컴포넌트
- 에러 알림: `window.alert()` → Toast 알림 (destructive variant)
- 성공 알림: Toast 추가 ("삭제 완료")

**Before**:
```typescript
if (!confirm('정말 삭제하시겠어요?')) return;
// ...
catch (e) {
  alert(message);
}
```

**After**:
```typescript
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogTitle>삭제 확인</AlertDialogTitle>
    <AlertDialogDescription>정말 삭제하시겠어요?</AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={onDelete}>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**관리자 헤더 개선** (`header.tsx`):
- 홈페이지 링크 추가 (새 탭으로 열림)
- 플로팅 pill 디자인에 통합

**최신순 정렬 적용**:
- 프로그램 어드민: `createdAt: 'desc'` (status 없을 때)
- 저널 어드민: `createdAt: 'desc'` (includeUnpublished일 때)
- 아티스트/베뉴/아트워크: 이미 `createdAt: 'desc'` 적용됨

#### 3. 저널 폼 미리보기 모달

**기능**: 저장 전 게시글 미리보기

**구현** (`journal-form-view.tsx`):
- "미리보기" 버튼 추가 (저장 버튼 옆)
- Dialog 컴포넌트로 전체화면 모달 표시
- 현재 폼 데이터를 journal-detail-view 스타일로 렌더링
- 표시 내용:
  - 커버 이미지 (preview URL 또는 placeholder)
  - 제목, 요약, 본문
  - 태그, 발행일
- 닫기 버튼으로 편집으로 복귀

**UI 구조**:
```tsx
<Dialog open={showPreview} onOpenChange={setShowPreview}>
  <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
    <DialogHeader>
      <DialogTitle>미리보기</DialogTitle>
    </DialogHeader>
    {/* 커버 이미지, 제목, 메타정보, 요약, 본문 */}
  </DialogContent>
</Dialog>
```

#### 4. URL 클립보드 복사 기능

**신규 컴포넌트** (`copy-url-button.tsx`):
- 현재 페이지 URL을 클립보드에 복사
- Link 아이콘 표시 (텍스트 없음)
- 복사 성공/실패 시 Toast 알림
- `aria-label`로 접근성 보장

**적용 위치**:
- 프로그램 상세: ShareButton 제거 → CopyUrlButton 교체
- 저널 상세: CopyUrlButton 추가 (날짜 옆)

**구현**:
```typescript
const handleCopy = async () => {
  const url = window.location.href;
  await navigator.clipboard.writeText(url);
  toast({ title: '링크 복사됨', description: '현재 페이지 URL을 클립보드에 복사했습니다.' });
};
```

#### 5. 저널 상세페이지 정리

**변경**: 작성자 닉네임 제거
- Before: `{date} · {author.username}`
- After: `{date}` (날짜만 표시)

**이유**: 저널 콘텐츠 중심으로 미니멀하게 표시

---

### 기술적 개선사항

**CLAUDE.md 문서 업데이트**:
1. `check:fix` 명령어 추가
2. 인증 미들웨어 상세 설명
3. 데이터 페칭 캐싱 전략 문서화

**파일 구조**:
- 신규: `src/components/shared/copy-url-button.tsx`
- 수정: 12개 파일 (372 추가, 77 삭제)

---

### 커밋 정보

```
0bc599a feat: improve UX with navigation, modals, and clipboard features
```

**주요 변경사항**:
- 네비게이션 메뉴 추가 (리스트/상세 페이지)
- Alert → Toast/Dialog 전환 (어드민)
- 저널 미리보기 모달 추가
- 어드민 리스트 최신순 정렬
- URL 클립보드 복사 기능 (아이콘만)
- 저널 상세 작성자 닉네임 제거
- 어드민 홈페이지 링크 추가
- 저널 이미지 표시 개선
- 업로드 에러 처리 강화

---

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
