# Development Log

> 이전 기록은 [dev-log-archive.md](dev-log-archive.md) 참조

## 2026-03-13

### 티켓팅 시스템 프로덕션 마이그레이션

**배경:**
- 티켓팅 테이블(TicketTier, Order, OrderItem, Payment)이 dev DB에만 존재
- 프로덕션(Neon main 브랜치)에 수동 마이그레이션 필요

**작업 내용:**
1. **수동 마이그레이션 SQL 작성** (`prisma/migrations/20250313000000_add_ticketing_tables/migration.sql`)
   - `TicketTierStatus`, `OrderStatus`, `PaymentStatus` enum 생성
   - `TicketTier`, `Order`, `OrderItem`, `Payment` 테이블 생성
   - `Program.ticketingEnabled` 컬럼 추가
   - 인덱스 및 외래키 제약조건 설정
2. **Neon 콘솔에서 직접 SQL 실행** (prisma migrate dev는 히스토리 drift로 사용 불가)
3. **Article.programId 컬럼 누락 수정** — `ALTER TABLE "Article" ADD COLUMN "programId" TEXT` 실행

**참고:** `prisma migrate dev`는 마이그레이션 히스토리가 실제 DB와 drift되어 사용 불가. `db push` 또는 직접 ALTER TABLE로 대응.

---

### 프로덕션 ProgramImage/ProgramCredit 데이터 복구

**문제:**
- 프로덕션 DB에서 `ProgramImage`와 `ProgramCredit` 테이블이 0건
- 추정 원인: `db push`가 테이블을 drop/recreate하면서 데이터 소실, 또는 갤러리 수정 시 `deleteRemovedImages()` 버그 (빈 배열 전달 시 전체 삭제)
- Neon 무료 티어: point-in-time recovery 최대 24시간으로 복구 불가

**해결:**
1. Dev DB에서 ProgramImage, ProgramCredit 데이터 추출
2. Program slug 기준으로 dev programId → prod programId 매핑
3. 복구 SQL 생성 후 Neon 콘솔에서 실행
4. Vercel ISR 캐시 퍼지 후 갤러리 정상 표시 확인

**교훈:**
- `db push`는 프로덕션에서 주의 (테이블 drop 가능성)
- 갤러리 편집 시 빈 배열 전달 방지 로직 필요
- 중요 데이터는 주기적 백업 권장

---

### 프로그램 상세 페이지 UI 개선

**변경 사항:**

1. **뒤로가기 버튼 위치 이동**
   - Before: 히어로 이미지 위 오버레이 (좌상단)
   - After: URL 복사 아이콘과 같은 라인 (nav bar 좌측)
   - `BackButton`의 기본 `hidden md:flex`를 `flex`로 오버라이드

2. **갤러리 모달 슬라이드 번호 배지 고정**
   - Before: 각 `CarouselItem` 안에 배치 → 스와이프 시 이미지와 함께 이동
   - After: `Carousel` 바깥 고정 배치, `modalApi.on('select')` 이벤트로 현재 인덱스 추적
   - 파일: `src/modules/programs/ui/section/program-gallery.tsx`

3. **종료된 이벤트 티켓 섹션 분기**
   - 일반 사용자: "Closed" 텍스트만 표시
   - 관리자 로그인 시: 관리자 전용 안내 배너 + 기존 티켓 UI 노출
   - `getSession()`으로 관리자 여부 확인
   - 파일: `src/modules/programs/ui/views/program-detail-view.tsx`

4. **발행 설정 UI 개선**
   - Before: `{isPublished ? '비공개' : '공개'}` — 상태 언어 + 반대로 표시되어 혼란
   - After: 체크박스 라벨 "공개하기" (액션 언어) + 상태 안내 텍스트 추가
   - 파일: `src/modules/programs/ui/views/program-form-view.tsx`

**커밋:**
```
b145d58 fix: 프로그램 상세 페이지 UI 개선
b36471c style: apply biome formatting
```

---

### 티켓 시스템 프로그램 분리

**변경 사항:**
- 프로그램 상세 페이지에서 티켓 섹션 완전 제거
- 프로그램 수정 페이지에서 티켓 관련 UI 제거
- `TicketTier`/`Order`에서 `programId` 외래키 제거
- `Program.ticketingEnabled` 컬럼 제거
- 독립 `/admin/tickets` 페이지 생성 (이후 Drops로 전환)

**마이그레이션:** `prisma/migrations/20250313100000_decouple_tickets_from_programs/migration.sql`

**커밋:** `0b4ef1a refactor: 티켓 시스템을 프로그램에서 분리하여 독립 관리로 전환`

---

### Drops 시스템 구현

**배경:** 티켓만이 아닌 굿즈도 판매할 수 있는 통합 판매 플랫폼 필요. "Shop" 대신 "Drop"으로 네이밍. Drop 모델이 컨테이너 역할을 하여 `TicketTier[]` 또는 `GoodsVariant[]`를 포함.

**스키마 변경:**
- `Drop` 모델 추가 (slug, title, type: ticket|goods, status: 5단계)
- `DropImage` 모델 추가
- `GoodsVariant` 모델 추가 (name, price, stock, soldCount, options JSON)
- `TicketTier.dropId?`, `Order.dropId?` 추가 (nullable — 기존 고아 데이터 호환)
- `OrderItem.goodsVariantId?` 추가
- `DropType`, `DropStatus` enum 추가

**Admin 페이지:**
- `/admin/drops` — Drop 목록 (타입, 상태, 매출, 주문수)
- `/admin/drops/new` — 새 Drop 생성 (티켓/굿즈 선택)
- `/admin/drops/[id]` — Drop 상세 편집 + 통계 카드 + 티켓 등급 관리
- `/admin/drops/[id]/orders` — 주문 목록 + 취소 기능
- 기존 `/admin/tickets` → `/admin/drops` 리다이렉트

**Public 페이지:**
- `/drops` — 전체/티켓/굿즈 필터 탭 + 카드 그리드
- `/drops/[slug]` — 타입별 두 가지 레이아웃:
  - 티켓: 풀스크린 히어로(영상/이미지) + 오버레이 타이틀 + sticky 구매 사이드바
  - 굿즈: 29cm 스타일 세로 이미지 갤러리 + sticky 옵션 선택/수량/구매 UI

**파일 구조:**
```
src/modules/drops/
├── server/actions.ts          # CRUD + getDropStats, getDropOrders, listDrops, listAdminDrops
└── ui/views/
    ├── drops-admin-list-view.tsx
    ├── drop-form-view.tsx
    ├── drop-detail-view.tsx
    ├── drop-orders-view.tsx
    ├── drops-list-view.tsx      # Public 목록 (Server Component)
    ├── ticket-drop-detail-view.tsx
    └── goods-drop-detail-view.tsx
```

**티켓 컴포넌트 dropId 연동:**
- `ticket-tier-form.tsx` — `dropId` prop 추가, `createTicketTier(dropId, data)` 호출
- `ticket-tier-list.tsx` — `dropId` prop 전달
- `ticket-purchase-section.tsx` — `dropId` prop 추가, `createOrder(dropId, input)` 호출

**삭제된 파일:**
- `ticket-dashboard-view.tsx` → `drop-detail-view.tsx`로 대체
- `orders-list-view.tsx` → `drop-orders-view.tsx`로 대체

**마이그레이션:** `prisma/migrations/20250313200000_add_drops_tables/migration.sql`
- Dev DB: `prisma db push --accept-data-loss` (programId/ticketingEnabled 컬럼 제거 포함)
- Prod DB: Neon 콘솔에서 SQL 직접 실행

**커밋:** `f6fc9e3 feat: Drops 시스템 구현 — 티켓/굿즈 통합 판매 플랫폼`

**다음 단계:**
- ~~굿즈 옵션(GoodsVariant) Admin CRUD UI 구현~~ ✅
- 굿즈 결제 플로우 연동 (PortOne)
- ~~Drop 이미지 업로드 (Cloudflare Images 연동)~~ ✅
- PortOne 환경변수 설정 및 티켓 결제 테스트
- Prisma 마이그레이션 히스토리 베이스라이닝 (긴급하지 않음)

---

## 2026-03-20

### Drops 시스템 버그 수정 및 굿즈 옵션 CRUD 구현

**커밋:** `6fa95e0 feat: Drops 시스템 버그 수정 및 굿즈 옵션 CRUD 구현`

#### 버그 수정

**1. 'use server' 동기 함수 export 오류**
- `src/lib/cdn/cloudflare.ts`의 `extractImageId`, `extractVideoId`가 동기 함수인데 `'use server'` 파일에서 export → Next.js 16이 Server Action으로 취급하면서 "must be async" 에러
- 수정: export 제거 (파일 내부 전용), `extractVideoId`를 `src/lib/utils.ts`로 이동, `drops/server/actions.ts`에서 `@/lib/utils` import로 변경

**2. Radix Select + React 19 무한 루프**
- `@radix-ui/react-select` 2.2.6의 `name` prop이 `<form>` 내부에서 React 19와 무한 re-render 유발
- 수정: `name`/`defaultValue` 대신 controlled state(`value`/`onValueChange`) + hidden `<input>`으로 변경
- 영향 파일: `drop-form-view.tsx`, `drop-detail-view.tsx`

**3. useMultiImageUpload 무한 리렌더**
- `onGalleryChange` 콜백이 인라인 함수로 전달되어 매 렌더마다 새 참조 → useEffect deps 변경 → 무한루프
- 수정: `useRef`로 콜백 저장, useEffect deps에서 제거

**4. 갤러리 이미지 업로드 결과 payload 누락**
- `uploadPendingWithProgress()`가 Cloudflare에 업로드 후 `setMultiImagePreview`로 상태 업데이트하지만, React 상태는 비동기라 바로 다음 줄의 `galleryImages`에 반영 안 됨
- 수정: `uploadPendingWithProgress`가 `images` 배열을 동기적으로 반환, payload에서 직접 사용

**5. 이미지 업로드 실패해도 Drop 생성 진행**
- `failCount > 0`일 때 toast만 표시하고 생성 진행됨
- 수정: 실패 시 `return`으로 중단, 실패 이미지 재시도 가능

**6. Drop 공개 목록에 표시 안 됨**
- `listDrops`가 `publishedAt: { not: null }` 필터하는데, 상태만 변경하면 `publishedAt`이 null인 채로 남음
- 수정: `createDrop`에서 draft 아닌 상태로 생성 시 `publishedAt` 자동 설정, `updateDrop`에서 draft → 공개 전환 시 자동 설정

**7. 공개 목록 카드 이미지 깨짐**
- `drops-list-view.tsx`에서 Cloudflare Images URL을 variant 없이 사용
- 수정: `getImageUrl(heroImage, 'public')` 적용

**8. 굿즈 옵션 버튼이 부모 폼 submit 트리거**
- `GoodsVariantList`가 `DropDetailView`의 `<form>` 안에 중첩 → 내부 버튼이 부모 폼 submit
- 수정: `<form id="drop-form">`으로 분리, 티켓/굿즈 섹션은 form 밖 배치, 저장 버튼 `form="drop-form"` 연결

#### 신규 기능

**1. Drop 수정 페이지**
- `/admin/drops/[id]/edit` 라우트 추가
- `DropFormView`를 수정 모드로 재사용 (이미 `drop` prop 지원)
- `DropDetailView` 헤더에 "수정" 버튼 추가
- 수정 완료 후 상세 페이지로 리다이렉트

**2. 굿즈 옵션(GoodsVariant) CRUD**
- Zod schema: `goodsVariantSchema` (이름, 가격, 재고, JSON 옵션)
- Server actions: `createGoodsVariant`, `updateGoodsVariant`, `deleteGoodsVariant`
- UI: `GoodsVariantForm` (모달), `GoodsVariantList` (목록 + 판매율 바)
- `DropDetailView`에서 goods 타입일 때 "준비 중" → `GoodsVariantList` 교체

**3. DateTimePicker 캘린더 컴포넌트**
- `shadcn/ui Calendar` (react-day-picker) + Popover + 시간 입력
- 티켓 등급 폼의 `datetime-local` input을 캘린더 팝오버로 교체

#### DB 마이그레이션 히스토리 정리
- Dev DB 브랜치(`br-soft-night-a1npfrcm`)에 미적용 마이그레이션 5개를 `prisma migrate resolve --applied`로 기록 정리 (스키마는 이미 `db push`로 적용된 상태)

**다음 단계:**
- ~~굿즈 결제 플로우 연동 (PortOne)~~ ✅
- PortOne 결제 테스트 (환경변수 설정 완료, 브라우저 테스트 필요)
- ~~굿즈 상세 페이지에 비디오 표시 추가~~ ✅
- Prisma 마이그레이션 히스토리 베이스라이닝 (긴급하지 않음)

---

## 2026-03-24

### 굿즈 결제 플로우 및 사이트 인프라 개선

**커밋:** `833b914`, `7c1afdd`, `4c14586`, `abe05a7`

#### 굿즈 결제 플로우 (PortOne 연동)

- `goodsOrderFormSchema` Zod schema 추가 (`goodsVariantId` 기반)
- `createGoodsOrder` 서버 액션 — 재고 확인/차감 + 주문 생성 (트랜잭션)
- `GoodsPurchaseSection` 클라이언트 컴포넌트 — 구매자 정보 입력 → PortOne 결제 → 검증
- `cancelOrder`에 굿즈 재고 복원 로직 추가 (`goodsVariantId` 기반 `soldCount` decrement)
- 굿즈 상세 페이지의 "구매하기" 버튼을 실제 결제 플로우로 연결
- 무료 상품 지원 (결제 없이 주문 생성)

#### 굿즈 상세 페이지 비디오 지원

- `GoodsDrop` 타입에 `videoUrl` 추가
- 비디오가 있으면 갤러리 첫 번째 슬라이드로 `<video>` 표시
- 썸네일에 ▶ 아이콘으로 비디오/이미지 구분
- 화살표 + 썸네일 네비게이션에서 비디오/이미지 인덱스 통합 관리

#### Drops OG 이미지

- `/drops/[slug]/opengraph-image.tsx` 추가
- 히어로 이미지 배경 + 타입 뱃지(TICKET/GOODS) + 제목/요약 + 최저 가격 + 상태
- Noto Sans KR 웹폰트 로드, Programs/Journal OG와 동일한 디자인 패턴

#### 커스텀 404 페이지

- `src/app/not-found.tsx` 추가
- 미니멀 디자인 (404 코드, 안내 문구, 홈/프로그램 링크)

#### Sitemap & Robots.txt 정리

- `sitemap.ts`에 Drops 동적 라우트 추가 (공개된 Drop만, `publishedAt` 기준)
- `/drops` 정적 라우트 추가 (priority 0.9)
- `robots.txt`에서 잘못 섞인 JavaScript 코드 제거, `/dashboard/*` disallow 제거 (미사용)

#### 관리자 대시보드 Drops 통계

- 기존 6개 카드에 Drops(개수), 주문(건수), 매출(총액) 3개 카드 추가
- `AdminStatsCard` value 타입을 `number | string`으로 확장 (매출 "원" 단위 표시)
- `prisma.order.aggregate` 사용하여 paid/confirmed 주문 매출 합산

#### 주문 확인 이메일

- `OrderConfirmation` React Email 템플릿 — 주문번호, Drop명, 상품 목록, 합계 금액
- `verifyPayment` 성공 시 구매자 이메일로 자동 발송 (실패해도 결제 결과에 영향 없음)
- `verifyPayment`에서 `drop.title`, `goodsVariant` 정보도 함께 조회하도록 include 확장

#### 이미지 최적화

- Drops 목록 카드 이미지를 네이티브 `<img>` → Next.js `<Image>` 교체 (자동 lazy loading + sizes 최적화)

#### UX 개선 (이전 세션)

- 저널/프로그램 공개 설정 체크박스를 Switch 토글로 교체
- 저널 리치 에디터 빈 줄(empty paragraph) 표시 CSS 추가

**다음 단계:**
- PortOne 결제 브라우저 테스트 (티켓/굿즈 모두)
- 검색 기능 (콘텐츠 50개 이상 시 도입)
- Program 상태값 단순화 리팩토링 (draft/published — 메모리에 기록)
- Prisma 마이그레이션 히스토리 베이스라이닝
