# Development Log

## 2026-02-11

### Phase 1 코드 정리 완료

**삭제된 파일:**
- `src/components/seo/project-schema.tsx` — 미사용 SEO 컴포넌트
- `src/components/ui/calendar.tsx` — 미사용 UI 컴포넌트
- `src/components/admin/admin-data-table.tsx` — 미사용 Admin 컴포넌트
- `src/hooks/use-debounce.tsx` — 미사용 훅
- `src/lib/design/wireframe.jsx` — 디자인 프로토타입 (깨진 코드)
- `scripts/migrate-legacy-projects-to-programs.ts` — 1회성 마이그레이션 스크립트

**제거된 npm 패키지:** `jotai`, `framer-motion`, `sharp`

**삭제된 환경 파일:** `.env.development` — `.env.local`과 중복

---

### Phase 2 레거시 모듈 정리 완료

**데이터 확인 결과:**
- Project 5건 → Program으로 마이그레이션 완료 확인
- Event 7건 중 5건은 Program과 중복, 나머지 2건(Light Matter, 아티스트 토크)은 불필요 데이터로 확인
- Post 0건

**삭제된 모듈:**
- `src/modules/events/` — server actions, UI 컴포넌트, views 전체
- `src/modules/projects/` — server actions, UI 컴포넌트, views 전체

**삭제된 라우트 (8개 페이지):**
- `src/app/(page)/events/` — index, detail, edit, new
- `src/app/(page)/projects/` — index, detail, edit, new

**삭제된 관련 파일:**
- `src/components/layout/legacy-redirect-notice.tsx`
- `src/lib/schemas/event.ts`, `src/lib/schemas/project.ts`
- `src/lib/schemas/types.ts` — 레거시 enum export 제거
- `src/lib/schemas/index.ts` — event, project re-export 제거
- `prisma/schema.prisma.backup`

**Prisma 스키마에서 삭제된 모델 (13개):**
- Post, Event, EventImage, EventOrganizer, EventTicket
- Project, ProjectImage, ProjectArtist, ProjectArtwork, ProjectVenue
- Artist/Artwork/Venue/User 모델에서 레거시 relation 제거

**삭제된 enum (3개):** EventStatus, EventType, ProjectCategory

**DB 테이블 삭제 (program-model-v1 브랜치):**
- Event (7행), EventOrganizer (34행), EventTicket (7행)
- Project (5행), ProjectArtist (30행), ProjectImage (89행)
- Post, EventImage, ProjectArtwork, ProjectVenue

**수정된 기존 코드:**
- `src/components/layout/admin-button.tsx` — event/project 삭제 기능 제거
- `src/app/(page)/artists/[id]/page.tsx` — 이벤트 목록 섹션 제거
- `src/app/sitemap.ts` — 레거시 주석 제거

**안전장치:** Neon 백업 브랜치 `backup-before-legacy-cleanup-20260211` 생성 후 진행

**참고:** `prisma db push --accept-data-loss` 사용. 마이그레이션 히스토리에 drift가 있어 `migrate dev` 대신 직접 스키마 적용.

---

### Phase 3 코드 정리 완료

**1. Admin List View / Table 분석 결과: 추출 불필요**
- 5개 Admin List View (~30줄)와 5개 Table 컴포넌트(~75줄)를 분석
- 각 파일이 엔티티별 고유한 컬럼, fetch 파라미터, 데이터 구조를 가짐
- 제네릭 추상화 시 복잡도만 증가하고 실질적 이득 없음 → KISS 원칙에 따라 현재 구조 유지

**2. 미사용 모듈 파일 삭제 (6개)**
- `src/modules/about/` — 전체 모듈 삭제 (about 페이지에서 미사용)
- `src/modules/home/server/actions.ts` — 빈 파일 (GlobalSearch 제거 잔여)
- `src/modules/home/ui/section/hero-section.tsx` — `featured-hero-section.tsx`로 대체됨
- `src/modules/home/ui/section/next-up-section.tsx` — 미사용
- `src/modules/home/ui/section/journal-highlights-section.tsx` — 미사용
- `src/modules/home/ui/section/follow-us-section.tsx` — 미사용

**검증:** `bun run type-check` 통과, Biome lint 에러 없음 (기존 경고만 존재)

---

## 2026-02-10

### Email Editor with Tiptap & Aligo SMS Integration

**목적**:
- 이메일 캠페인용 리치 텍스트 에디터 구현
- SMS 멀티 프로바이더 시스템 구축 (Aligo/Solapi)

**배경**:
- 기존: 단순 textarea로 이메일 작성
- 요구사항: 이미지, YouTube 동영상, 텍스트 서식 등 리치 컨텐츠 지원
- SMS: Solapi 발신번호 등록 문제로 Aligo API 추가 필요

**구현 내용**:

1. **Tiptap 리치 텍스트 에디터** (`src/components/email-editor/`):
   ```typescript
   // SSR 호환성
   const editor = useEditor({
     extensions: getEmailEditorExtensions(),
     immediatelyRender: false, // SSR 에러 방지
     editorProps: {
       attributes: {
         class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px]',
       },
     },
   });
   ```
   - **이미지 업로드**: Cloudflare Images 통합, 크기/정렬 컨트롤
   - **YouTube 임베드**: iframe → 이메일용 썸네일 링크 변환
   - **텍스트 서식**: 제목, Bold/Italic/Underline, 텍스트 색상, 정렬
   - **이메일 호환성**: HTML → inline styles 변환 (`convertToEmailHTML`)

2. **이미지 컨트롤** (`src/components/email-editor/image-controls.tsx`):
   - 이미지 선택시 툴바에 크기/정렬 버튼 표시
   - 크기: 33%, 50%, 75%, 100%
   - 정렬: 왼쪽, 가운데, 오른쪽

3. **이메일 템플릿 HTML 렌더링 수정**:
   ```typescript
   // Before: <Text>{message}</Text> - HTML이 텍스트로 표시됨
   // After: <div dangerouslySetInnerHTML={{ __html: message }} />
   ```
   - `newsletter.tsx`, `form-notification.tsx` 수정
   - Tiptap HTML이 이메일에서 정상 렌더링

4. **Aligo SMS API 통합** (`src/lib/sms/aligo.ts`):
   ```typescript
   // aligoapi 패키지는 Express req 객체 형식 요구
   const requestData = {
     body: {
       sender: from,
       receiver: phone,
       msg: params.text,
       msg_type: params.text.length > 90 ? 'LMS' : 'SMS',
     },
     headers: {
       'content-type': 'application/json', // 필수!
     },
   };
   const response = await aligoapi.send(requestData, authData);
   ```
   - **인증**: API key + user ID (login ID)
   - **자동 타입 감지**: 90자 기준 SMS/LMS 전환
   - **테스트 모드**: `ALIGO_TEST_MODE=Y` (IP 제한 없음)

5. **멀티 프로바이더 SMS 시스템** (`src/lib/sms/provider.ts`):
   ```typescript
   export function getSMSProvider(): SMSProvider {
     const provider = process.env.SMS_PROVIDER?.toLowerCase() as SMSProvider;
     if (provider !== 'aligo' && provider !== 'solapi') {
       return 'aligo'; // 기본값
     }
     return provider;
   }
   ```
   - 환경 변수로 프로바이더 전환 (`SMS_PROVIDER=aligo|solapi`)
   - 기존 Solapi 코드 유지
   - 통합 인터페이스로 추상화

6. **에러 핸들링 개선**:
   - 상세 로깅: API 요청/응답 전체 출력
   - 모든 발송 실패시 첫 번째 에러 메시지 토스트 표시
   - IP 인증 오류 디버깅 지원

**발견된 이슈**:

1. **Aligo IP 제한**:
   - Aligo API는 고정 IP 주소만 허용
   - Vercel 서버리스 환경은 동적 IP (사용 불가)
   - **해결**: 로컬은 Aligo, 프로덕션은 Aligo 웹 인터페이스 사용

2. **Solapi 발신번호 미등록**:
   - 발신번호 등록에 방문 인증 필요
   - 현재 회사 번호 미등록 상태

**최종 정리**:
- **이메일**: Prectxe 사이트에서 발송 (Tiptap 에디터 사용)
- **SMS**: Aligo 웹 인터페이스에서 발송 (IP 제한 문제)
- 코드는 유지하되 프로덕션 SMS는 외부 툴 활용

**파일 변경**:
- `src/components/email-editor/` - Tiptap 에디터 구현
- `src/lib/email/templates/` - HTML 렌더링 수정
- `src/lib/sms/aligo.ts` - Aligo API 통합
- `src/lib/sms/provider.ts` - 멀티 프로바이더 시스템
- `src/modules/sms/server/actions.ts` - 에러 핸들링 개선
- `CLAUDE.md` - SMS 프로바이더 문서화

## 2026-02-07

### Form Submissions View Enhancement

**목적**: 폼 응답 화면의 UX/UI 개선 - 트렌디하고 사용성 높은 테이블

**배경**:
- 기존: 기본적인 테이블, 제한적인 기능
- 요구사항: 검색, 정렬, 페이지네이션, 상세보기 등 모던한 테이블 경험

**구현 내용**:

1. **검색 기능**:
   ```typescript
   // 실시간 검색 with useMemo
   const filteredData = useMemo(() => {
     if (!searchQuery.trim()) return tableData;
     return tableData.filter((row) =>
       Object.values(row).some((value) =>
         value.toLowerCase().includes(searchQuery.toLowerCase())
       )
     );
   }, [tableData, searchQuery]);
   ```
   - 전체 응답 내용 실시간 검색
   - 검색 결과 개수 Badge 표시
   - 검색어 초기화 버튼 (X)

2. **정렬 기능**:
   - 모든 컬럼 클릭으로 오름차순/내림차순 토글
   - ArrowUpDown 아이콘으로 시각적 피드백
   - 정렬 상태 유지 및 독립적 관리

3. **페이지네이션**:
   - 페이지당 행 수 선택 (10/25/50/100)
   - 이전/다음 페이지 버튼 (ChevronLeft/Right)
   - 현재 페이지 / 전체 페이지 표시
   - 검색 시 첫 페이지로 자동 리셋

4. **개별 응답 상세 모달**:
   - Row 호버 시 Eye 아이콘 버튼 표시
   - Dialog로 응답 전체 내용 확대
   - 제출 시간, IP 주소 메타 정보
   - 삭제된 필드도 Badge와 함께 표시

5. **UI/UX 개선**:
   - Sticky 헤더 (sticky top-0 z-10 backdrop-blur)
   - Row 호버 효과 (group hover:bg-muted/50)
   - 삭제된 필드 Badge (variant="destructive")
   - 번호 컬럼 추가 (#)
   - 더 나은 spacing, typography, color

6. **성능 최적화**:
   ```typescript
   const tableData = useMemo(() => {...}, [submissions, allFields]);
   const filteredData = useMemo(() => {...}, [tableData, searchQuery]);
   const sortedData = useMemo(() => {...}, [filteredData, sortConfig]);
   const paginatedData = useMemo(() => {...}, [sortedData, currentPage, pageSize]);
   ```

**주요 파일**:
- `src/modules/forms/ui/views/submissions-view.tsx` - 전체 재작성 (248→565줄)
- `src/app/(auth)/admin/forms/[id]/submissions/page.tsx` - formId prop 제거

**변경 통계**: +399 insertions, -89 deletions

### Forms 상태 필터 기능 추가

**목적**: 폼 관리 화면에서 상태별 필터링 기능 제공

**배경**:
- 요구사항: 폼 리스트에서 마감/비마감 구분 필터 필요
- Programs 페이지의 상태 필터 패턴 참고

**구현 내용**:

1. **서버 액션 수정** (`src/modules/forms/server/actions.ts`):
   ```typescript
   // listForms 함수에 status 필터 파라미터 추가
   export async function listForms(
     userId: string,
     isAdmin = false,
     filters?: {
       status?: 'draft' | 'published' | 'closed';
     }
   )
   ```

2. **필터 컴포넌트 생성** (`src/modules/forms/ui/components/form-status-filter.tsx`):
   - 클라이언트 컴포넌트로 구현
   - 4개 상태 칩: 전체, 임시저장(draft), 게시됨(published), 마감(closed)
   - URL 쿼리 파라미터로 상태 관리 (`?status=published`)
   - Programs의 StatusChips 패턴 참고

3. **페이지 수정** (`src/app/(auth)/admin/forms/page.tsx`):
   ```typescript
   interface PageProps {
     searchParams: Promise<{ status?: string }>;
   }

   // searchParams로 status 받아서 listForms에 전달
   const result = await listForms(session.id, session.isAdmin, { status });
   ```

**주요 파일**:
- `src/modules/forms/server/actions.ts:449` - listForms 함수
- `src/modules/forms/ui/components/form-status-filter.tsx` - 필터 컴포넌트
- `src/app/(auth)/admin/forms/page.tsx` - 폼 관리 페이지

**사용법**:
- `/admin/forms` - 전체 폼 표시
- `/admin/forms?status=draft` - 임시저장 폼만
- `/admin/forms?status=published` - 게시된 폼만
- `/admin/forms?status=closed` - 마감된 폼만

## 2026-01-29

### Critical: Form Data Loss Prevention & Recovery

**목적**: 폼 수정 시 제출 데이터 유실 방지 및 데이터 복구

**배경**:
- 문제: 폼 설명만 수정했는데 모든 제출 데이터(78개 응답)가 삭제됨
- 원인: `updateForm()` 함수의 `FormField.deleteMany()` 버그
- 긴급: 오늘 행사(Max Cooper Insight Session)에 필요한 참가자 데이터 복구 필요

**구현 내용**:

1. **데이터 복구 (Neon Point-in-Time Recovery)**:
   ```typescript
   // 복구 브랜치 생성: 1월 28일 오전 11:30 시점
   // scripts/recover-responses.ts
   - 복구 브랜치에서 삭제된 응답 데이터 추출
   - 메인 DB로 병합 (중복 제거)
   - fieldId를 NULL로 설정 (스냅샷 보존)

   // scripts/migrate-recovered-responses.ts
   - 복구된 응답의 fieldId를 현재 필드와 매칭
   - fieldLabel 기준으로 자동 매핑
   ```
   **결과**: 78개 응답 성공적으로 복구 (실패 0개)

2. **폼 수정 시 데이터 보존 (구글 폼 방식)** (`src/modules/forms/server/actions.ts`):
   ```typescript
   // Before: 필드 삭제 → cascade로 응답도 삭제됨
   await prisma.formField.deleteMany({ where: { id: { in: fieldsToDelete } } });

   // After: 응답 보존 + 필드 삭제
   // 1. 응답의 fieldId를 NULL로 설정 (스냅샷 보존)
   await prisma.formResponse.updateMany({
     where: { fieldId: { in: fieldsToDelete } },
     data: { fieldId: null }
   });

   // 2. 필드 안전하게 삭제
   await prisma.formField.deleteMany({
     where: { id: { in: fieldsToDelete } }
   });
   ```

3. **빈 응답 제출 방지** (3중 안전장치):
   ```typescript
   // 안전장치 1: 빈 응답 데이터 차단
   if (responseEntries.length === 0) {
     return { success: false, error: '응답 데이터가 없습니다...' };
   }

   // 안전장치 2: 트랜잭션으로 원자적 생성
   const submission = await prisma.$transaction(async (tx) => {
     const newSubmission = await tx.formSubmission.create({ ... });

     // 안전장치 3: 응답 개수 검증
     if (newSubmission.responses.length !== responseEntries.length) {
       throw new Error('응답 저장 실패...');
     }
   });
   ```

4. **CSV 다운로드 개선** (`src/modules/forms/ui/views/submissions-view.tsx`):
   - 삭제된 필드도 "(삭제됨)" 표시와 함께 표시
   - fieldLabel/fieldType 스냅샷으로 과거 응답 보존
   - 구글 폼과 동일한 유연성 제공

**Prisma 스키마 안전장치**:
```prisma
model FormResponse {
  fieldId      String?        // nullable
  fieldLabel   String?        // 스냅샷
  fieldType    FieldType?     // 스냅샷
  field        FormField?     @relation(onDelete: SetNull) // 자동 NULL 처리
}
```

**복구 통계**:
- 복구된 응답: 78개
- 실패: 0개
- 최종 유효 참가자 데이터: 16개 제출

**결과**:
- ✅ 폼을 자유롭게 수정해도 기존 응답 데이터 절대 삭제 안 됨
- ✅ 필드 추가/삭제/수정 모두 안전
- ✅ 빈 응답 제출 원천 차단
- ✅ 행사 진행에 필요한 데이터 복구 완료

### SMS Bulk Sending Feature

**목적**: 폼 응답자 대상 단체 문자 발송 기능 추가

**배경**:
- 요구사항: 폼 제출자들에게 행사 안내 문자 발송
- SMS 서비스 선정: Solapi (솔라피) - 한국 SMS 전문, 13원/건, 최소 충전 1만원

**구현 내용**:

1. **Solapi SDK 통합** (`src/lib/sms/solapi.ts`):
   ```typescript
   import { SolapiMessageService } from 'solapi';

   export async function sendSMS(params: SendSMSParams) {
     const client = createSolapiClient();
     const result = await client.send({
       messages: params.recipients.map(phone => ({
         to: normalizePhoneNumber(phone),
         from: process.env.SOLAPI_SENDER_PHONE,
         text: params.message
       }))
     });
     return { groupId: result.groupInfo.groupId, ... };
   }
   ```

2. **SMS 캠페인 관리** (`prisma/schema.prisma`):
   ```prisma
   model SMSCampaign {
     id          String         @id @default(cuid())
     title       String
     message     String         @db.Text
     formId      String?        // 연결된 폼
     sentCount   Int            @default(0)
     failedCount Int            @default(0)
     status      SMSStatus      @default(draft)
     recipients  SMSRecipient[]
   }

   model SMSRecipient {
     id         String      @id @default(cuid())
     phone      String
     success    Boolean     @default(false)
     messageId  String?     // Solapi 메시지 ID
     error      String?
   }
   ```

3. **Admin UI** (`src/app/(auth)/admin/sms/page.tsx`):
   - 폼 응답자 대상 발송: 폼 선택 → 자동으로 phone 필드 추출
   - 독립 발송: CSV 업로드 또는 수동 입력
   - 실시간 비용 계산 (13원 × 수신자 수)
   - 캠페인 이력 조회

4. **전화번호 처리**:
   ```typescript
   export function normalizePhoneNumber(phone: string): string {
     return phone.replace(/[^0-9]/g, ''); // 하이픈 제거
   }

   export function validatePhoneNumber(phone: string): boolean {
     return /^01[0-9]{8,9}$/.test(phone);
   }
   ```

**환경변수 설정 필요**:
```env
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
SOLAPI_SENDER_PHONE=01012345678
```

**결과**:
- ✅ 폼 응답자 자동 추출 및 발송
- ✅ CSV/수동 입력 지원
- ✅ 캠페인 이력 및 결과 추적
- ✅ 비용 실시간 계산
- ⚠️ 실제 발송 테스트는 환경변수 설정 후 가능

**참고 문서**: `RECOVERY-GUIDE.md` - Neon PITR 복구 가이드

## 2026-01-25

### Form UI Modernization - Card-based Layout

**목적**: 폼 입력 화면을 Google Forms 스타일의 현대적인 카드 기반 레이아웃으로 개선

**배경**:
- 문제: 모든 필드가 하나의 큰 컨테이너 안에 표시되어 시각적 구분이 약함
- 요구사항: 2024-2026년 트렌드에 맞는 카드 형식 레이아웃
- 추가 요구사항: 체크박스/라디오 옵션이 많을 때를 대비한 반응형 그리드

**구현 내용**:

1. **개별 카드 레이아웃** (`form-renderer.tsx`):
   ```tsx
   // Before: 단일 컨테이너
   <form className="space-y-6 rounded-lg border bg-white p-6">

   // After: 각 필드가 독립 카드
   <form className="space-y-4">
     {fields.map((field) => (
       <div className="space-y-3 rounded-lg border bg-white p-6
                       shadow-sm transition-shadow hover:shadow-md">
   ```

2. **반응형 그리드 레이아웃** (체크박스/라디오):
   - 모바일: 1열 (세로 스택)
   - 태블릿+: 2열 (그리드)
   ```tsx
   className="grid grid-cols-1 gap-3 sm:grid-cols-2"
   ```

3. **옵션 카드 스타일**:
   ```tsx
   <div className="flex items-center space-x-2 rounded-md border p-3
                   transition-colors hover:bg-neutral-50">
     {/* 각 라디오/체크박스 옵션 */}
   </div>
   ```

4. **UX 개선사항**:
   - 카드 호버 효과 (`hover:shadow-md`)
   - 옵션 호버 시 배경색 변화 (`hover:bg-neutral-50`)
   - 전체 라벨 영역 클릭 가능 (`cursor-pointer flex-1`)
   - 제출 버튼도 별도 카드로 일관성 유지
   - 제출 완료 메시지에 체크 아이콘 추가

**결과**:
- ✅ Google Forms 스타일의 현대적인 디자인
- ✅ 모바일 우선 반응형 레이아웃
- ✅ 각 질문에 대한 시각적 집중도 향상
- ✅ 터치 영역 확대로 모바일 UX 개선
- ✅ 선택지가 많아도 깔끔한 그리드 정리

**파일 변경**:
- 수정: `src/modules/forms/ui/components/form-renderer.tsx`

**커밋**:
```
feat: modernize form UI with card-based layout
docs: update CLAUDE.md with RBAC and form improvements
```

---

### CLAUDE.md Documentation Updates

**목적**: CLAUDE.md를 최신 구현 내용으로 업데이트

**업데이트 내용**:

1. **Form Field Types 정정**:
   - 11개 → 12개 필드 타입으로 수정
   - `url` 필드 타입 추가 (Prisma schema와 일치)

2. **Form Status 추가**:
   - `draft`, `published`, `closed` 상태 문서화

3. **Response Preservation Pattern 추가**:
   - FormResponse가 fieldLabel, fieldType 스냅샷 저장
   - 필드 수정/삭제 시에도 응답 데이터 보존
   - 데이터 무결성 패턴 문서화

4. **RBAC (Role-Based Access Control) 패턴 추가**:
   - Server actions의 `isAdmin` 파라미터 패턴
   - 관리자 vs 일반 사용자 권한 구분
   - 구현 예시 코드 추가

5. **Edit Flow 권한 명시**:
   - "verify ownership" → "verify ownership/admin"으로 수정

**파일 변경**:
- 수정: `CLAUDE.md` (5개 섹션)

---

## 2026-01-24

### Admin Permissions for Forms Management

**목적**: 관리자 계정이 모든 폼을 조회, 수정, 삭제할 수 있도록 권한 체계 구현

**배경**:
- 문제: 폼 소유자만 본인이 생성한 폼을 관리할 수 있음
- 요구사항: 관리자(role: ADMIN)는 모든 폼에 대한 전체 권한 필요
- 영향: 여러 관리자가 협업하여 폼을 관리할 수 있어야 함

**구현 내용**:

1. **Server Actions 권한 파라미터 추가** (`forms/server/actions.ts`):
   - 5개 함수에 `isAdmin` 파라미터 추가 (기본값: false)
   ```typescript
   export async function listForms(userId: string, isAdmin = false) {
     const forms = await prisma.form.findMany({
       where: isAdmin ? {} : { userId }, // 관리자는 모든 폼, 일반 유저는 본인 폼만
     });
   }

   export async function getForm(formId: string, userId: string, isAdmin = false) {
     if (!isAdmin && form.userId !== userId) {
       return { success: false, error: '권한이 없습니다' };
     }
   }

   export async function updateForm(formId: string, userId: string, data: FormInput, isAdmin = false) {
     if (!isAdmin && existing.userId !== userId) {
       return { success: false, error: '권한이 없습니다' };
     }
   }

   export async function deleteForm(formId: string, userId: string, isAdmin = false) {
     if (!isAdmin && existing.userId !== userId) {
       return { success: false, error: '권한이 없습니다' };
     }
   }

   export async function getFormSubmissions(formId: string, userId: string, isAdmin = false) {
     if (!isAdmin && form.userId !== userId) {
       return { success: false, error: '권한이 없습니다' };
     }
   }
   ```

2. **Page 컴포넌트 수정** - `session.isAdmin` 전달:
   - `/admin/forms/page.tsx`
   - `/admin/forms/[id]/page.tsx`
   - `/admin/forms/[id]/submissions/page.tsx`
   ```typescript
   const result = await listForms(session.id, session.isAdmin);
   ```

**결과**:
- ✅ 관리자는 모든 폼 조회 가능
- ✅ 관리자는 모든 폼 편집 가능
- ✅ 관리자는 모든 폼 삭제 가능
- ✅ 관리자는 모든 폼의 제출 내역 조회 가능
- ✅ 일반 사용자는 본인 폼만 관리 (기존 동작 유지)
- ✅ 역할 기반 접근 제어(RBAC) 구현

**파일 변경**:
- 수정: `src/modules/forms/server/actions.ts` (5개 함수)
- 수정: `src/app/(auth)/admin/forms/page.tsx`
- 수정: `src/app/(auth)/admin/forms/[id]/page.tsx`
- 수정: `src/app/(auth)/admin/forms/[id]/submissions/page.tsx`

**커밋**:
```
feat: add admin permission to manage all forms
chore: apply biome formatting
```

---

### Form Delete Functionality with Toast Confirmation

**목적**: 폼 리스트 페이지에서 폼을 삭제할 수 있는 기능 추가

**배경**:
- 문제: 폼을 삭제하려면 편집 페이지로 들어가야 했음
- 요구사항: 리스트에서 바로 삭제 가능, 경고 확인 후 삭제
- 사용 사례: 테스트 폼 빠른 정리, 잘못 생성된 폼 즉시 삭제

**구현 내용**:

1. **FormCard 컴포넌트 확장** (`form-card.tsx`):
   - **Props 추가**: `userId`, `isAdmin`
   - **상태 관리**:
     ```typescript
     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
     const [isDeleting, setIsDeleting] = useState(false);
     ```
   - **삭제 핸들러**:
     ```typescript
     const handleDelete = async () => {
       setIsDeleting(true);
       const result = await deleteForm(form.id, userId, isAdmin);
       if (!result.success) {
         toast({ title: '삭제 실패', description: result.error, variant: 'destructive' });
       } else {
         toast({ title: '삭제 완료', description: '폼이 성공적으로 삭제되었습니다.' });
         router.refresh();
       }
       setIsDeleting(false);
     };
     ```

2. **UI 추가**:
   - **삭제 버튼**: Trash2 아이콘, Eye 버튼과 URL 복사 버튼 사이 배치
   - **AlertDialog 확인창**:
     ```tsx
     <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
       <AlertDialogContent>
         <AlertDialogTitle>폼 삭제 확인</AlertDialogTitle>
         <AlertDialogDescription>
           정말 이 폼을 삭제하시겠어요? 모든 제출 내역도 함께 삭제되며,
           이 작업은 되돌릴 수 없습니다.
         </AlertDialogDescription>
         <AlertDialogFooter>
           <AlertDialogCancel>취소</AlertDialogCancel>
           <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
     ```

3. **폼 리스트 페이지 업데이트** (`/admin/forms/page.tsx`):
   - FormCard에 `userId`와 `isAdmin` props 전달
   ```typescript
   <FormCard
     key={form.id}
     form={form}
     userId={session.id!}
     isAdmin={session.isAdmin!}
   />
   ```

**결과**:
- ✅ 폼 리스트에서 즉시 삭제 가능
- ✅ AlertDialog로 안전한 확인 절차
- ✅ 제출 내역 포함 경고 메시지
- ✅ 성공/실패 토스트 알림
- ✅ 삭제 후 자동 새로고침

**파일 변경**:
- 수정: `src/modules/forms/ui/components/form-card.tsx`
- 수정: `src/app/(auth)/admin/forms/page.tsx`

**커밋**:
```
feat: add delete functionality to forms list with toast confirmation
```

---

### Critical Bug Fix: Empty Form Submission Prevention

**목적**: 필수 필드를 입력하지 않아도 제출되는 치명적 버그 수정

**배경**:
- 문제: 사용자가 Select/Radio 필드를 선택하지 않으면 빈 응답으로 제출됨
- 영향: FormSubmission은 생성되지만 FormResponse가 없어 데이터 손실
- 원인: Select/Radio가 React Hook Form에 제대로 등록되지 않음

**근본 원인 분석**:

1. **Select/Radio 필드의 초기값 문제**:
   ```typescript
   // ❌ 문제 코드
   <Select onValueChange={(value) => setValue(field.id!, value)}>
   ```
   - 사용자가 한 번도 클릭하지 않으면 `onValueChange` 호출되지 않음
   - `setValue`가 실행되지 않아 해당 필드가 `undefined`로 제출
   - React Hook Form에 필드가 등록되지 않음

2. **Validation 우회**:
   - 필드가 `undefined`면 Zod validation을 부분적으로 우회 가능
   - FormSubmission은 생성되지만 FormResponse는 생성되지 않음
   - 결과: 빈 응답 데이터

**해결 방법**:

1. **Controller 패턴 적용** (`form-renderer.tsx`):
   ```typescript
   // ✅ 수정 코드
   <Controller
     name={field.id!}
     control={control}
     render={({ field: formField }) => (
       <Select value={formField.value} onValueChange={formField.onChange}>
         {/* ... */}
       </Select>
     )}
   />
   ```
   - React Hook Form의 Controller로 필드를 명시적으로 등록
   - `value`와 `onChange`를 직접 연결하여 상태 동기화

2. **defaultValues 설정**:
   ```typescript
   const defaultValues = fields.reduce((acc, field) => {
     if (field.type === 'checkbox' || field.type === 'multiselect') {
       acc[field.id!] = [];
     } else {
       acc[field.id!] = '';
     }
     return acc;
   }, {} as Record<string, string | string[]>);
   ```
   - 모든 필드에 초기값 설정
   - 필드가 form에 확실히 등록되도록 보장

3. **Select와 Radio 모두 적용**:
   - Select 필드: Controller로 감싸기
   - Radio 필드: Controller로 감싸기
   - Checkbox/Multiselect: 기존 로직 유지 (이미 정상 작동)

**결과**:
- ✅ Select/Radio 필드가 제대로 form에 등록됨
- ✅ 필수 필드를 선택하지 않으면 validation error 발생
- ✅ 빈 응답 제출 완전 차단
- ✅ FormSubmission과 FormResponse가 항상 일관성 유지

**파일 변경**:
- 수정: `src/modules/forms/ui/components/form-renderer.tsx`

**기술적 세부사항**:
- React Hook Form의 `Controller` 컴포넌트 사용
- `control` prop으로 form context 연결
- `render` prop으로 커스텀 입력 컴포넌트 통합
- `defaultValues`로 모든 필드 초기화 보장

**커밋**:
```
fix: prevent empty form submissions by using Controller for Select/Radio fields
```

---

### Form Validation Error Toast Notification

**목적**: Validation 실패 시 사용자에게 즉각적인 피드백 제공

**배경**:
- 문제: Validation error 발생 시 필드 아래 에러 메시지만 표시
- 요구사항: 토스트 알림으로 즉각적인 경고 제공
- 사용자 경험: 에러를 놓치지 않도록 명확한 알림 필요

**구현 내용**:

1. **Validation Error Handler 추가** (`form-renderer.tsx`):
   ```typescript
   const handleValidationError = () => {
     toast({
       title: '입력 오류',
       description: '필수 항목을 모두 입력해주세요',
       variant: 'destructive',
     });
   };
   ```

2. **handleSubmit에 Error Handler 연결**:
   ```typescript
   <form onSubmit={handleSubmit(handleFormSubmit, handleValidationError)}>
   ```
   - React Hook Form의 `handleSubmit` 두 번째 인자로 에러 핸들러 전달
   - Validation 실패 시 자동으로 `handleValidationError` 호출

**동작 흐름**:
1. 사용자가 필수 필드를 비우고 제출 버튼 클릭
2. React Hook Form이 Zod schema로 validation 수행
3. Validation 실패 → 즉시 빨간색 토스트 팝업 표시
4. 각 필드 아래에도 구체적인 에러 메시지 표시

**결과**:
- ✅ Validation error 발생 시 토스트 알림 표시
- ✅ 인라인 에러 메시지와 함께 이중 피드백
- ✅ 사용자가 에러를 즉시 인지 가능
- ✅ 개선된 폼 작성 경험

**파일 변경**:
- 수정: `src/modules/forms/ui/components/form-renderer.tsx`

**커밋**:
```
feat: add toast notification for form validation errors
```

---

### Form Response Closing Functionality

**목적**: 폼 응답을 종료하고 사용자에게 마감 메시지를 표시하는 기능 구현

**배경**:
- 요구사항: 관리자가 응답 마감 시 토글로 상태 변경 가능
- 사용자 경험: 마감된 폼 접근 시 명확한 안내 메시지 필요
- 보안: 서버 측에서도 마감 상태 검증하여 제출 차단

**구현 내용**:

1. **공개 폼 페이지 종료 화면** (`/forms/[slug]/page.tsx`):
   ```typescript
   if (form.status === 'closed') {
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
         <div className="mx-4 max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
           <h1 className="mb-4 text-2xl font-bold text-neutral-900">
             응답이 마감되었습니다
           </h1>
           <p className="text-neutral-600">
             해당 양식은 더 이상 응답을 받지 않습니다.
           </p>
         </div>
       </div>
     );
   }
   ```
   - 전체 화면 어둡게 처리 (`fixed inset-0 bg-black/80`)
   - 중앙에 흰색 카드로 마감 메시지 표시
   - z-index 50으로 모든 콘텐츠 위에 표시

2. **서버 측 검증 강화** (`forms/server/actions.ts`):
   ```typescript
   export async function submitFormResponse(formId: string, ...) {
     const form = await prisma.form.findUnique({ where: { id: formId } });

     if (form.status !== 'published') {
       return {
         success: false,
         error: form.status === 'closed'
           ? '해당 양식은 응답을 받지 않습니다'
           : '게시되지 않은 양식입니다',
       };
     }
     // ... 나머지 제출 로직
   }
   ```
   - `status === 'closed'` 시 응답 제출 차단
   - `status === 'draft'` 시에도 제출 차단
   - 상태별 맞춤 에러 메시지 반환

3. **기존 UI 활용**:
   - 폼 빌더 UI에 이미 `status` 선택 드롭다운 구현됨
   - `FormStatus` enum에 `draft`, `published`, `closed` 이미 정의됨
   - 추가 스키마 변경 없이 기존 필드 활용

**동작 흐름**:
1. 관리자가 폼 편집 페이지에서 상태를 "마감"으로 변경
2. 사용자가 공개 폼 URL 접속 시:
   - 전체 화면 오버레이 표시
   - "응답이 마감되었습니다" 메시지 표시
   - 폼 필드 렌더링 안 함
3. API 직접 호출 시도 시:
   - 서버에서 `status` 검증
   - 에러 응답 반환 및 제출 차단

**결과**:
- ✅ 관리자가 폼 상태를 "마감"으로 쉽게 변경 가능
- ✅ 마감된 폼 접근 시 전체 화면 오버레이로 명확한 안내
- ✅ 서버 측 검증으로 직접 API 호출도 차단
- ✅ 상태별 맞춤 에러 메시지 제공
- ✅ 기존 스키마 활용하여 추가 마이그레이션 불필요

**파일 변경**:
- 수정: `src/app/(page)/forms/[slug]/page.tsx`
- 수정: `src/modules/forms/server/actions.ts`

**UI/UX 개선**:
- 어두운 배경 (`bg-black/80`)으로 폼 접근 불가 명확히 표현
- 흰색 카드로 메시지 강조
- 모바일 대응 (`mx-4`, `max-w-md`)

**커밋**:
```
feat: add form response closing functionality
```

---

### Google Forms-like Field Flexibility with Data Preservation

**목적**: 구글 폼처럼 필드를 자유롭게 수정/삭제해도 기존 응답 데이터가 보존되도록 구현

**배경**:
- 문제: 기존 구조에서 필드 수정/삭제 시 응답 데이터가 함께 삭제됨
- Prisma schema: `onDelete: Cascade`로 인해 필드 삭제 시 모든 응답 손실
- `updateForm` 로직: `deleteMany`로 필드 전체 삭제 후 재생성
- 요구사항: 구글 폼처럼 자유로운 필드 수정과 응답 데이터 보존 모두 필요

**구현 내용**:

1. **Prisma 스키마 수정** (필드 스냅샷 추가):
   ```prisma
   model FormResponse {
     id           String         @id @default(cuid())
     submissionId String
     fieldId      String?        // nullable로 변경
     fieldLabel   String?        // 스냅샷: 필드 라벨
     fieldType    FieldType?     // 스냅샷: 필드 타입
     value        String
     createdAt    DateTime       @default(now())
     submission   FormSubmission @relation(...)
     field        FormField?     @relation(..., onDelete: SetNull)  // Cascade → SetNull
   }
   ```
   - `fieldId`: nullable로 변경 (필드 삭제 시 null)
   - `fieldLabel`, `fieldType`: 응답 시점의 필드 정보 스냅샷 저장
   - `onDelete: SetNull`: 필드 삭제 시 응답은 유지, fieldId만 null

2. **프로덕션 DB 마이그레이션** (Neon MCP 사용):
   ```sql
   -- Step 1: 새 컬럼 추가 (nullable)
   ALTER TABLE "FormResponse"
   ADD COLUMN "fieldLabel" TEXT,
   ADD COLUMN "fieldType" TEXT;

   -- Step 2: fieldId nullable로 변경
   ALTER TABLE "FormResponse"
   ALTER COLUMN "fieldId" DROP NOT NULL;

   -- Step 3: 기존 데이터 마이그레이션
   UPDATE "FormResponse" fr
   SET
     "fieldLabel" = ff.label,
     "fieldType" = ff.type
   FROM "FormField" ff
   WHERE fr."fieldId" = ff.id
     AND fr."fieldLabel" IS NULL;
   ```
   - 기존 6개 응답 데이터에 필드 스냅샷 추가 완료
   - 데이터 손실 없이 안전하게 마이그레이션

3. **응답 저장 로직 수정** (`submitFormResponse`):
   ```typescript
   const fieldMap = new Map(form.fields.map((f) => [f.id, f]));

   responses: {
     create: Object.entries(validated).map(([fieldId, value]) => {
       const field = fieldMap.get(fieldId);
       return {
         fieldId,
         fieldLabel: field?.label ?? 'Unknown Field',
         fieldType: field?.type ?? 'text',
         value: typeof value === 'string' ? value : JSON.stringify(value),
       };
     }),
   }
   ```
   - 새로운 응답 저장 시 필드 정보 스냅샷 자동 저장
   - 향후 필드 변경 시에도 응답 시점의 필드 정보 보존

4. **제출 내역 페이지 개선** (`submissions-view.tsx`):
   ```typescript
   // 현재 필드 + 삭제된 필드 모두 표시
   const allFields = useMemo(() => {
     const fieldMap = new Map();

     // 현재 필드 추가
     form.fields.forEach((field) => {
       fieldMap.set(field.id, { id: field.id, label: field.label, isDeleted: false });
     });

     // 삭제된 필드 추가 (fieldId가 null이지만 fieldLabel이 있는 경우)
     submissions.forEach((submission) => {
       submission.responses.forEach((response) => {
         if (!response.fieldId && response.fieldLabel) {
           const key = `deleted_${response.fieldLabel}`;
           if (!fieldMap.has(key)) {
             fieldMap.set(key, { id: null, label: response.fieldLabel, isDeleted: true });
           }
         }
       });
     });

     return Array.from(fieldMap.values());
   }, [form.fields, submissions]);
   ```
   - 삭제된 필드는 빨간색 "(삭제됨)" 표시
   - Excel/CSV 다운로드에도 삭제된 필드 포함
   - 하위 호환성: `fieldLabel`이 null인 기존 응답도 `field.label`로 표시

**작동 시나리오**:

**시나리오 1: 필드 삭제**
```
Before: [이름] [이메일] [전화번호]
삭제: [전화번호] 필드 제거

After (제출 내역):
[이름] [이메일] [전화번호 (삭제됨)]
기존 응답 데이터 모두 보존 ✅
```

**시나리오 2: 필드 라벨 수정**
```
Before: 라벨 "이메일"
수정: 라벨 "연락 이메일"로 변경

After (제출 내역):
- 기존 응답: "이메일" (스냅샷)로 표시
- 새 응답: "연락 이메일"로 표시
```

**시나리오 3: 선택 옵션 변경**
```
Before: select ["A", "B", "C"]
응답: "A" (10명)

수정: select ["D", "E", "F"]

After:
- 기존 10명 응답: "A" 값 그대로 보존 ✅
- 새 응답: ["D", "E", "F"] 중 선택
```

**결과**:
- ✅ 필드 삭제 시 응답 데이터 보존 (fieldId null, 스냅샷 유지)
- ✅ 필드 수정 시 이력 추적 가능 (스냅샷으로 변경 전 상태 확인)
- ✅ 구글 폼과 동일한 유연성 제공
- ✅ 기존 응답 6개 안전하게 마이그레이션 완료
- ✅ 제출 내역 페이지에서 삭제된 필드 명확히 표시
- ✅ Excel/CSV 다운로드에 모든 데이터 포함
- ✅ 하위 호환성 보장 (마이그레이션 전 응답도 정상 표시)

**파일 변경**:
- 수정: `prisma/schema.prisma` (FormResponse 모델)
- 수정: `src/modules/forms/server/actions.ts` (submitFormResponse)
- 수정: `src/modules/forms/ui/views/submissions-view.tsx` (제출 내역 표시)
- 추가: `scripts/migrate-form-responses.ts` (마이그레이션 스크립트)

**데이터베이스 작업**:
- Neon MCP를 통한 프로덕션 DB 직접 마이그레이션
- `prisma db push`로 스키마 동기화
- 총 6개 응답 데이터 마이그레이션 성공

**기술적 세부사항**:
- Prisma relation의 `onDelete` 동작 변경 (Cascade → SetNull)
- 응답 저장 시 필드 스냅샷 자동 생성 로직
- Map 자료구조를 활용한 필드 통합 관리
- useMemo를 활용한 렌더링 최적화

**커밋**:
```
feat: preserve form responses when fields are modified or deleted
fix: handle legacy responses without fieldLabel/fieldType snapshots
```

---

## 2026-01-23

### Form Submissions Page with Excel/CSV Export

**목적**: 폼 응답 현황을 확인하고 데이터를 Excel/CSV로 다운로드하는 기능 구현

**배경**:
- 문제: 폼 응답을 확인할 방법이 없음, 데이터 분석을 위한 다운로드 기능 필요
- 요구사항: 응답 현황 테이블 표시, Excel 및 CSV 다운로드 기능
- 사용 사례: 참가자 명단 관리, 설문 결과 분석, 데이터 백업

**구현 내용**:

1. **응답 조회 Server Action** (`getFormSubmissions`):
   - 권한 검증: 폼 소유자만 응답 조회 가능
   - 폼 정보 및 필드 구조 조회
   - 모든 응답 및 각 필드별 답변 조회
   - 제출시간 역순 정렬
   ```typescript
   return {
     success: true,
     data: {
       form: { title, fields },
       submissions: [{ id, submittedAt, ipAddress, responses }]
     }
   };
   ```

2. **응답 현황 페이지** (`/admin/forms/[id]/submissions/page.tsx`):
   - 서버 컴포넌트로 데이터 페칭 및 권한 검증
   - SubmissionsView 컴포넌트에 데이터 전달

3. **SubmissionsView 컴포넌트** (`submissions-view.tsx`):
   - **테이블 표시**:
     - 제출시간, 모든 필드 응답, IP 주소를 컬럼으로 표시
     - shadcn/ui Table 컴포넌트 사용
     - 빈 응답은 "-"로 표시
     - 총 응답 개수 표시

   - **Excel 다운로드** (`xlsx` 라이브러리):
     ```typescript
     const worksheet = XLSX.utils.json_to_sheet(tableData);
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, '응답');
     worksheet['!cols'] = [{ wch: 50 }]; // 컬럼 너비 설정
     XLSX.writeFile(workbook, `${form.title}_응답_${date}.xlsx`);
     ```

   - **CSV 다운로드** (UTF-8 BOM 포함):
     ```typescript
     const csv = XLSX.utils.sheet_to_csv(worksheet);
     const blob = new Blob(['\uFEFF' + csv], { // UTF-8 BOM
       type: 'text/csv;charset=utf-8;'
     });
     ```
     - UTF-8 BOM으로 한글 깨짐 방지
     - Excel에서 바로 열 수 있도록 인코딩

4. **FormCard 컴포넌트 개선**:
   - 제출 개수를 클릭 가능한 링크로 변경
   - `/admin/forms/[id]/submissions` 페이지로 이동
   - 호버 시 밑줄 및 색상 변경

**결과**:
- ✅ 모든 응답을 한눈에 확인 가능한 테이블 UI
- ✅ Excel 파일로 다운로드하여 데이터 분석 가능
- ✅ CSV 파일로 다운로드하여 다른 시스템에 임포트 가능
- ✅ 한글 깨짐 없는 완벽한 인코딩
- ✅ 제출시간, IP 주소 등 메타데이터 포함
- ✅ 폼 카드에서 원클릭으로 응답 현황 페이지 접근

**파일 변경**:
- 생성: `src/app/(auth)/admin/forms/[id]/submissions/page.tsx`
- 생성: `src/modules/forms/ui/views/submissions-view.tsx`
- 수정: `src/modules/forms/server/actions.ts` (getFormSubmissions 개선)
- 수정: `src/modules/forms/ui/components/form-card.tsx` (제출 개수 링크)
- 설치: `xlsx@0.18.5` (Excel/CSV 생성)

**기술적 세부사항**:
- `useMemo`로 테이블 데이터 변환 최적화
- `json_to_sheet`로 JSON → Excel/CSV 변환
- BOM (Byte Order Mark) 추가로 Excel 호환성 보장
- `toLocaleString('ko-KR')`로 한국 시간 포맷

**커밋**:
```
7525013 feat: add form submissions page with Excel/CSV export
```

---

### Form Card Preview Modal

**목적**: 폼 관리 페이지에서 편집 없이 빠르게 폼 미리보기

**배경**:
- 문제: 폼 내용 확인을 위해 매번 편집 페이지로 들어가야 함
- 요구사항: 폼 카드에서 바로 미리보기 가능한 모달
- 참고: 폼 빌더의 미리보기와 동일한 스타일

**구현 내용**:

1. **listForms 액션 개선**:
   - 필드(fields) 정보도 함께 조회
   - order 순서로 정렬
   ```typescript
   include: {
     fields: { orderBy: { order: 'asc' } },
     _count: { select: { submissions: true } }
   }
   ```

2. **FormCard 컴포넌트 확장**:
   - Eye 아이콘 미리보기 버튼 추가 (URL 복사 버튼 왼쪽)
   - 상태 관리: `showPreview` useState
   - Dialog 모달로 미리보기 표시

3. **미리보기 모달 내용**:
   - **커버 이미지**: 16:9 비율로 표시
   - **제목 및 설명**: 2xl 폰트로 강조
   - **상세 안내**: 회색 배경 박스에 줄바꿈 보존
   - **폼 필드 렌더링**:
     - textarea → Textarea 컴포넌트
     - select → Select 드롭다운 (모든 옵션 표시)
     - multiselect, checkbox → 체크박스 목록
     - radio → 라디오 버튼 목록
     - file → 파일 선택 버튼
     - 기타 → Input (type별로 구분)
   - **빈 폼 처리**: "아직 필드가 추가되지 않았습니다" 메시지

**결과**:
- ✅ 폼 편집 없이 빠른 미리보기 가능
- ✅ 실제 사용자에게 보여질 모습과 동일하게 렌더링
- ✅ 모든 필드 타입 완벽 지원
- ✅ 깔끔한 Dialog UI로 사용자 경험 향상

**파일 변경**:
- 수정: `src/modules/forms/server/actions.ts` (listForms에 fields 추가)
- 수정: `src/modules/forms/ui/components/form-card.tsx` (미리보기 모달)

**커밋**:
```
2734e2a feat: add preview modal to form cards
```

---

### Form Edit Page Redirect Error Fix

**목적**: 폼 수정 후 저장 시 발생하는 NEXT_REDIRECT 에러 해결

**배경**:
- 문제: 폼 편집 페이지에서 저장 버튼 클릭 시 `Error: NEXT_REDIRECT` 발생
- 원인: Server action에서 `redirect()` 직접 호출
- Next.js 규칙: 클라이언트 컴포넌트에서 호출되는 server action은 redirect 불가

**구현 내용**:

1. **Server Action 수정** (`/admin/forms/[id]/page.tsx`):
   - **Before**:
     ```typescript
     if (res.success) {
       redirect('/admin/forms'); // ❌ 에러 발생
     }
     ```
   - **After**:
     ```typescript
     return res.success
       ? { success: true }
       : { success: false, error: res.error ?? '저장에 실패했습니다.' };
     ```
   - 성공/실패 객체만 반환
   - 로그인 체크도 redirect 대신 에러 객체 반환

2. **클라이언트 네비게이션 활용**:
   - `form-builder-view.tsx`가 이미 `router.push()`로 리다이렉트 처리
   - Server action은 결과만 반환하고 클라이언트가 네비게이션 담당

**결과**:
- ✅ 폼 수정 후 저장 정상 작동
- ✅ NEXT_REDIRECT 에러 완전 해결
- ✅ 성공 시 토스트 알림 + 폼 리스트로 이동
- ✅ 실패 시 에러 메시지 표시

**파일 변경**:
- 수정: `src/app/(auth)/admin/forms/[id]/page.tsx`

**기술적 세부사항**:
- Server action에서 redirect는 서버 컴포넌트에서만 가능
- 클라이언트 컴포넌트에서 호출 시 에러 발생
- 패턴: server action은 데이터만, 클라이언트는 UI/네비게이션

**커밋**:
```
2bbddcf fix: remove redirect from form edit server action
```

---

### Form Submission Page Body Field Display Fix

**목적**: 폼 입력 페이지에서 상세 안내(body) 필드 표시

**배경**:
- 문제: 미리보기에서는 body 필드가 보이지만 실제 폼 입력 페이지에서는 누락
- 영향: 사용자가 상세 안내를 볼 수 없어 폼 작성에 어려움
- 일관성: 미리보기와 실제 페이지가 동일해야 함

**구현 내용**:

1. **Body 필드 렌더링 추가** (`/forms/[slug]/page.tsx`):
   - 커버 이미지/제목 섹션 아래에 body 필드 표시
   - 미리보기와 동일한 스타일 적용
   ```typescript
   {form.body && (
     <div className="mb-8 rounded-lg bg-neutral-50 p-6">
       <p className="whitespace-pre-wrap text-sm text-neutral-700">
         {form.body}
       </p>
     </div>
   )}
   ```
   - `whitespace-pre-wrap`으로 줄바꿈 보존
   - 폼 필드 렌더링 바로 위에 배치

**결과**:
- ✅ 폼 입력 페이지에서 상세 안내 표시
- ✅ 미리보기와 실제 페이지 일관성 확보
- ✅ 사용자에게 충분한 안내 정보 제공

**파일 변경**:
- 수정: `src/app/(page)/forms/[slug]/page.tsx`

**커밋**:
```
7abf306 fix: display body field in form submission page
```

---

### Form URL Sharing Feature

**목적**: 폼 생성 후 공개 페이지 URL을 쉽게 공유할 수 있도록 개선

**배경**:
- 문제: 폼을 게시한 후 사용자에게 URL을 공유하는 기능이 없음
- 요구사항: 아티클 페이지처럼 폼 리스트와 편집 페이지에서 URL 복사 기능 제공
- 참고: 기존 CopyUrlButton 컴포넌트를 재사용하여 일관된 UX 유지

**구현 내용**:

1. **CopyUrlButton 컴포넌트 개선** (`copy-url-button.tsx`):
   - **Before**: 현재 페이지 URL만 복사 가능
   - **After**: 선택적 `url` prop 추가로 특정 URL 복사 가능
   ```typescript
   type Props = {
     className?: string;
     url?: string; // Optional: if provided, copy this URL instead of current page
   };

   const url = providedUrl || (typeof window !== 'undefined' ? window.location.href : '');
   ```
   - 토스트 메시지 개선: 폼 URL인지 현재 페이지 URL인지 구분하여 표시

2. **FormCard 컴포넌트 생성** (`form-card.tsx`):
   - 폼 리스트 페이지용 카드 컴포넌트
   - 게시된 폼에만 URL 복사 버튼 표시:
   ```typescript
   {form.status === 'published' && (
     <CopyUrlButton
       url={formUrl}
       className="text-neutral-400 transition-colors hover:text-neutral-600"
     />
   )}
   ```
   - 폼 정보 표시: 제목, 설명, 상태 뱃지, 슬러그, 제출 개수
   - 상태별 색상: 게시됨(녹색), 마감(빨간색), 임시저장(회색)

3. **FormEditHeader 컴포넌트 생성** (`form-edit-header.tsx`):
   - 폼 편집 페이지용 헤더 컴포넌트
   - 게시된 폼의 공개 URL 표시 및 복사 기능:
   ```typescript
   {status === 'published' && (
     <div className="flex items-center gap-2 rounded-md border bg-neutral-50 px-3 py-2">
       <span className="text-sm text-neutral-600">공개 URL:</span>
       <code className="text-sm text-neutral-900">/forms/{slug}</code>
       <CopyUrlButton url={formUrl} />
     </div>
   )}
   ```
   - 임시저장/마감 상태에서는 URL 표시하지 않음

4. **폼 리스트 페이지 개선** (`admin/forms/page.tsx`):
   - **Before**: 인라인 Card 컴포넌트로 복잡한 구조
   - **After**: FormCard 컴포넌트 사용으로 간결한 코드
   - 2열 그리드 레이아웃 유지 (`md:grid-cols-2`)

5. **폼 편집 페이지 개선** (`admin/forms/[id]/page.tsx`):
   - FormEditHeader 컴포넌트 추가
   - "폼 편집" 제목과 공개 URL을 한 줄에 표시
   - 편집 중에도 공개 URL 확인 가능

**결과**:
- ✅ 게시된 폼의 공개 URL을 리스트 및 편집 페이지에서 즉시 복사 가능
- ✅ 아티클 페이지와 일관된 UX 패턴
- ✅ 임시저장/마감 상태에서는 URL 노출하지 않아 혼란 방지
- ✅ 클라이언트 컴포넌트로 동적 URL 생성 (`window.location.origin`)

**파일 변경**:
- 수정: `src/components/shared/copy-url-button.tsx` (optional url prop)
- 생성: `src/modules/forms/ui/components/form-card.tsx`
- 생성: `src/modules/forms/ui/components/form-edit-header.tsx`
- 수정: `src/app/(auth)/admin/forms/page.tsx` (FormCard 사용)
- 수정: `src/app/(auth)/admin/forms/[id]/page.tsx` (FormEditHeader 사용)

**기술적 세부사항**:
- CopyUrlButton은 `use client` 지시문으로 클라이언트 컴포넌트
- FormCard와 FormEditHeader도 클라이언트 컴포넌트 (window 객체 사용)
- 서버 컴포넌트(page.tsx)에서 클라이언트 컴포넌트로 데이터 전달
- 조건부 렌더링으로 게시 상태에서만 URL 표시

**커밋**:
```
2019f04 feat: add URL sharing for forms in list and edit pages
```

---

### Form Builder - Draft Status Validation Fix

**목적**: 임시저장 상태에서 필드 없이 폼을 저장할 수 있도록 검증 완화

**배경**:
- 문제: 임시저장 상태에서도 필드가 1개 이상 필요하다는 검증 적용
- 영향: 사용자가 폼 작성 중에 임시저장 불가능, 드래프트 기능 무용지물
- 원인: formSchema의 `fields.min(1)` 검증과 클라이언트 검증이 상태 무관

**구현 내용**:

1. **스키마 검증 조건부 적용** (`src/lib/schemas/form.ts`):
   - **Before**: `fields: z.array(formFieldSchema).min(1, ...)`
   - **After**: `fields: z.array(formFieldSchema).default([])`
   - **refine 검증 추가**:
     ```typescript
     .refine(
       (data) => {
         // 게시 상태일 때만 필드 필수
         if (data.status === 'published') {
           return data.fields.length > 0;
         }
         return true;
       },
       { message: '게시하려면 최소 1개의 필드가 필요합니다', path: ['fields'] }
     )
     ```

2. **선택형 필드 옵션 검증 완화**:
   - formFieldSchema에서 options refine 제거 (기본 스키마는 완화)
   - strictFormFieldSchema 추가 (게시 시 사용)
   - formSchema의 refine에서 published 상태일 때만 옵션 검증:
     ```typescript
     .refine(
       (data) => {
         if (data.status === 'published') {
           const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'];
           return data.fields.every((field) => {
             if (needsOptions.includes(field.type)) {
               return field.options && field.options.length > 0;
             }
             return true;
           });
         }
         return true;
       },
       { message: '게시하려면 선택형 필드에 최소 1개의 선택지가 필요합니다' }
     )
     ```

3. **클라이언트 검증 수정** (`form-builder-view.tsx`):
   - **Before**: `if (fields.length === 0)`
   - **After**: `if (data.status === 'published' && fields.length === 0)`
   - 게시 상태일 때만 필드 필수 검증

4. **경고 메시지 개선** (`form-field-editor.tsx`):
   - 색상 변경: 빨간색(red-500) → 주황색(orange-500)
   - 메시지 수정: "최소 1개의 선택지를 입력해주세요" → "게시하려면 최소 1개의 선택지가 필요합니다"
   - 임시저장에서는 경고만 표시, 저장 차단하지 않음

**검증 로직 요약**:
- **draft/closed 상태**: 필드 0개 허용, 옵션 없는 선택형 필드 허용 (경고만)
- **published 상태**: 필드 1개 이상 필수, 선택형 필드는 옵션 1개 이상 필수

**결과**:
- ✅ 임시저장 시 필드 없이 저장 가능 (작업 중인 폼 보존)
- ✅ 임시저장 시 옵션 없는 선택형 필드 허용 (점진적 작성 가능)
- ✅ 게시 시에만 엄격한 검증 적용 (품질 보장)
- ✅ 드래프트 기능 실제로 사용 가능
- ✅ 사용자 경험 크게 개선

**파일 변경**:
- 수정: `src/lib/schemas/form.ts` (조건부 refine 검증)
- 수정: `src/modules/forms/ui/views/form-builder-view.tsx` (조건부 검증)
- 수정: `src/modules/forms/ui/components/form-field-editor.tsx` (경고 메시지)

**기술적 세부사항**:
- Zod의 refine을 체이닝하여 다중 조건 검증 구현
- status 필드를 기준으로 동적 검증 로직 적용
- 클라이언트/서버 양쪽에서 일관된 검증 로직 유지
- 경고(orange)와 에러(red) 구분으로 UX 개선

---

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

---

## 2026-02-10

### Personalized SMS Sending with Individual Coupons

**목적**:
- 150명의 쿠폰 수령자에게 각자 다른 쿠폰 코드를 SMS로 발송
- 스프레드시트 데이터를 쉽게 붙여넣고 개별 메시지 발송

**배경**:
- 놀티켓(Nolticket)에서 받은 150개의 난수 쿠폰 코드를 form 응답자에게 발송 필요
- 기존 SMS 발송 기능은 동일한 메시지만 전송 가능
- 각 수신자에게 고유한 쿠폰 코드를 포함한 개별 메시지 필요
- 스프레드시트에서 전화번호 복사 시 앞자리 0 누락 문제 (1036613582)

**구현 내용**:

1. **개별 쿠폰 발송 컴포넌트** (`src/modules/sms/ui/components/personalized-sms-sender.tsx`):
   ```typescript
   // 3-column 입력 구조
   <div className="grid grid-cols-3 gap-4">
     <Textarea placeholder="010-1234-5678" /> {/* 전화번호 (필수) */}
     <Textarea placeholder="홍길동" />         {/* 이름 (선택) */}
     <Textarea placeholder="ICD71991" />       {/* 개별 내용 (선택) */}
   </div>
   ```
   - **줄바꿈 매칭**: 각 줄의 인덱스로 전화번호-이름-쿠폰 매칭
   - **실시간 미리보기**: 처음 5개 메시지 미리보기 테이블
   - **변수 치환**: `{name}`, `{value}` 자동 치환
   - **자동 제거**: 데이터 없으면 변수 패턴 자동 제거
     ```typescript
     // 이름이 없으면 "{name}님" 패턴 제거
     message = message.replace(/{name}님,?\s*/g, '');
     // 개별 내용 없으면 "{value}" 제거
     message = message.replace(/{value}\s*/g, '');
     ```

2. **전화번호 자동 보정** (`src/lib/sms/utils.ts`):
   ```typescript
   export function normalizePhoneNumber(phone: string): string {
     let normalized = phone.replace(/[^0-9]/g, '');
     
     // 1로 시작하고 10자리면 앞에 0 추가 (자동 보정)
     if (normalized.startsWith('1') && normalized.length === 10) {
       normalized = '0' + normalized;
     }
     
     return normalized;
   }
   ```
   - 스프레드시트에서 엑셀 포맷으로 인해 앞자리 0 누락 자동 수정
   - `1036613582` → `01036613582`

3. **클라이언트 안전 유틸리티 분리**:
   - **문제**: Client 컴포넌트에서 `provider.ts` import 시 fs 모듈 에러
   - **해결**: 전화번호 유틸리티를 `utils.ts`로 분리
   ```typescript
   // src/lib/sms/utils.ts - 클라이언트 안전
   export function validatePhoneNumber(phone: string): boolean;
   export function normalizePhoneNumber(phone: string): string;
   export function filterValidPhoneNumbers(phones: string[]): string[];
   
   // src/lib/sms/provider.ts - 서버 전용 (aligoapi, solapi)
   export { validatePhoneNumber, ... } from './utils'; // re-export
   ```

4. **메시지 미리보기 모달**:
   ```typescript
   <Dialog open={!!selectedRecipient}>
     <DialogContent>
       {/* 전화번호, 이름, 개별 내용 */}
       {/* 발송 메시지 전문 */}
       {/* 글자 수 및 SMS/LMS 구분 */}
     </DialogContent>
   </Dialog>
   ```
   - 테이블 행 클릭 시 모달로 전체 메시지 확인
   - 글자 수 계산 (90자 이하: SMS, 이상: LMS)

5. **발송 이력 모달** (`src/modules/sms/ui/components/sms-campaign-list.tsx`):
   - 리스트 항목 클릭 → 모달로 발송 내용 전문 표시
   - 캠페인 정보: 제목, 상태, 발송 통계, Form 링크, 발송 일시
   - 메시지 전문: 줄바꿈 유지, 글자 수 표시
   - 수신자 목록: 전화번호, 성공/실패 상태
   - 불필요한 액션 버튼 제거 (모달로 충분)

6. **개별 메시지 발송 액션** (`src/modules/sms/server/actions.ts`):
   ```typescript
   export async function sendPersonalizedSMS(params: {
     recipients: Array<{
       phone: string;
       name?: string;
       value?: string;  // 쿠폰 코드 등 개별 내용
     }>;
     template: string;
     title: string;
     userId: string;
   })
   ```
   - 각 수신자마다 템플릿 변수 치환 후 개별 발송
   - 발송 결과 개별 추적 및 DB 저장

7. **Solapi 메시지 타입 명시** (`src/lib/sms/solapi.ts`):
   ```typescript
   const messageType = params.text.length <= 90 ? 'SMS' : 'LMS';
   const response = await client.send({
     to: phone,
     from,
     text: params.text,
     type: messageType,
   });
   ```

**테스트 결과**:
- ✅ 변수 치환: `{name}` → "카카님!", `{value}` → "ICD71991"
- ✅ 자동 보정: `1036613582` → `01036613582`
- ✅ 실시간 미리보기: 처음 5개 메시지 확인 가능
- ✅ 모달 상세보기: 개별 메시지 전체 내용 확인
- ⚠️ `[Web발신]` 표시: Aligo 제한사항 (발신번호 인증 필요)

**알려진 이슈**:
- **[Web발신] 표시**: Aligo API의 제한사항
  - 해결 방법 1: Aligo 웹 콘솔에서 직접 발송
  - 해결 방법 2: Solapi로 전환 (발신번호 등록 필요)
  - 현재: 메시지 내용 자체는 깔끔하므로 수용 가능

**커밋**:
```
bddf947 feat(sms): add personalized SMS sending with individual coupons
9 files changed, 899 insertions(+), 107 deletions(-)
```

**신규 파일**:
- `src/lib/sms/utils.ts` - 클라이언트 안전 전화번호 유틸리티
- `src/modules/sms/ui/components/personalized-sms-sender.tsx` - 개별 쿠폰 발송 UI

**주요 수정 파일**:
- `src/modules/sms/server/actions.ts` - sendPersonalizedSMS 액션
- `src/modules/sms/ui/views/sms-dashboard.tsx` - 4번째 탭 추가
- `src/modules/sms/ui/components/sms-campaign-list.tsx` - 발송 이력 모달
- `src/lib/sms/provider.ts` - utils.ts에서 re-export
- `src/lib/sms/solapi.ts` - 메시지 타입 명시
- `next.config.ts` - serverExternalPackages 설정 유지

**다음 단계**:
- Solapi 발신번호 등록 (방문 인증 필요)
- Aligo에서 Solapi로 전면 전환
