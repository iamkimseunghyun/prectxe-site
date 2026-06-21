# Development Log

> 이전 기록은 [dev-log-archive.md](dev-log-archive.md) 참조

## 2026-06-21

### 마케팅 트래킹 + 홈/Drops UX 개선 + 리치 에디터 버그픽스 (PR #45~#53)

하루 동안 PR 사이클(CodeRabbit/Gemini 리뷰 → 머지 → 프로덕션 실측)로 8건 반영.

#### 1. Meta Pixel 설치 + 전환 이벤트 (PR #46)
- App Router 정석대로 `next/script`(afterInteractive) 기반 `MetaPixel` 컴포넌트 + 루트 레이아웃 배선(GA와 동일하게 `NEXT_PUBLIC_META_PIXEL_ID` env 조건부 렌더).
- `meta-pixel.ts`가 `gtag.ts` 미러링 — ViewContent/InitiateCheckout/Purchase를 기존 drops/tickets 구매 흐름 호출부에 병행 발사.
- **이벤트 유실 방지 큐**: 광고로 상세 페이지 직접 랜딩 시 afterInteractive 스텁 초기화 전 호출된 이벤트가 유실될 수 있어, `window.fbq` 준비될 때까지 큐잉 후 flush(10s 타임아웃). **PIXEL_ID 미설정 시 추적 전체 no-op 게이트**(에러 없이 조용히 꺼짐).
- **SPA PageView**: 인라인 스크립트가 최초 1회, `usePathname` 변경마다 재발사(`@next/third-parties` GA와 달리 Meta는 자동 안 됨).
- **함정**: `NEXT_PUBLIC_*`는 빌드 인라인 → Vercel env 추가 **후 재배포**해야 적용. 머지 직후 옛 빌드엔 안 잡혀 프로덕션에서 `fbq` undefined였다가, 재배포 후 `facebook.com/tr?ev=PageView` 200 발사 **실측 확인**.

#### 2. 홈 히어로 크롭 (PR #45)
- featured 히어로 `object-cover`에 `object-top` 추가. 고정 높이 + 반응형 폭이라 브레이크포인트마다 크롭 영역이 달라 인물 얼굴이 잘리던 문제 완화(상단 기준 크롭). `object-contain`(전체 표시)은 레터박스·텍스트 오버레이 붕괴·임팩트 상실로 비채택. 후속 정밀 제어는 focal point 필드 과제로 남김.

#### 3. Drops 구매 UX (PR #47~#51, 티켓·goods 양쪽 일관화)
- **종료·매진 티어 노출 (#47)**: on_sale만 표시 → 매진(`Sold Out`)·판매종료(`Closed`) 티어도 회색+라벨로 남기고 구매 컨트롤만 비활성. on_sale을 맨 위 정렬, 오픈예정(scheduled)은 계속 숨김. 드롭 전체 종료/매진이면 기존 통합 카드 유지.
- **데스크톱 sticky 복구 (#48)**: 구매 위젯에 `lg:sticky`가 있는데도 본문 따라 밀려 올라감. **원인 = `<html className="overflow-y-scroll">`** — viewport overflow propagation이 html/body를 스크롤 컨테이너로 만들어 자손 `position:sticky` 무효화. `scrollbar-gutter:stable`로 교체(스크롤바 자리 확보 효과 유지, 스크롤 컨테이너 미생성). 프로덕션 실측: 위젯 top −654 → **32px 고정**.
- **모바일 하단 예매 바 (#49 티켓, #50 goods)**: 구매 섹션이 페이지 맨 아래(~9,800px)라 모바일 전환 누수 → `MobilePurchaseBar`(최저가 + 예약 CTA, `lg:hidden`). IntersectionObserver로 구매 섹션이 보이면 자동 숨김(내부 CTA와 비충돌), iOS `safe-area-inset-bottom` 대응. 티켓은 프로덕션 실측 완료(표시/숨김/`lg:hidden`), goods는 라이브 드롭 없어 동일 컴포넌트 재사용으로 갈음.
- **가격 "~" 정확화 (#50·#51)**: `variants/tiers.length > 1`만 보면 동일가 옵션(사이즈 등)에서도 "30,000원~"으로 오해 → `hasPriceRange = max > min`으로 실제 가격차 있을 때만 `~`. 티켓·goods 모두 적용.

**리뷰 메모**: CodeRabbit이 며칠째 burst(연속 PR) rate limit에 자주 걸림 — adaptive 한도라 간격 두면 풀림(#45는 통과, 직후 #46 막힘). 막힌 PR은 `/code-review`로 자체 리뷰 대체. Gemini는 7/17 종료 예정이나 유효 지적(이벤트 유실 큐·`object-top` 타입 분기·가격 `~`) 기여. **semantic 충돌 주의**: #47이 `availableTiers`→`onSaleTiers` 리네임 → #49 rebase가 텍스트 충돌 없이 "깨끗하게" 됐지만 빌드 깨짐(type-check가 잡음).

#### 4. 리치 에디터 툴바 폼 제출 버그 (PR #53)
- 드롭/저널 수정 모드에서 리치 에디터 툴바 버튼(h3·bold·정렬 등) 클릭 시 폼이 제출돼 저장+리다이렉트되던 버그. **원인 = shadcn `Button`이 `type` 기본값을 안 줌** → `<form>` 안에서 HTML 기본값 `type="submit"`으로 동작. `toolbar.tsx`·`image-controls.tsx`의 모든 `<Button>`에 `type="button"` 명시. 공유 컴포넌트라 저널 에디터 동일 버그도 해결.
- **근본 후속**: `Button` 자체를 `type="button"` 기본값으로 바꾸면 전역 예방되나, 암묵적 submit 의존 폼 제출 버튼이 깨질 수 있어 전체 폼 audit 선행 필요 → 별도 과제.

#### 남은 과제
- goods 라이브 드롭 오픈 시 모바일 바 실측.
- goods 상세 EN 로케일: LocaleSwitcher는 있으나 용어·가격 ko 고정(기존부터) → 별도 i18n.
- 히어로 focal point 필드, Meta 도메인 인증(광고 AEM).

---

## 2026-06-19

### 보안 감사 + DB 성능 점검 (대규모 하드닝)

하루 동안 보안·성능 다수 항목을 PR 사이클(CodeRabbit/Gemini 리뷰 → 머지 → 프로덕션 검증)로 반영.

#### 1. 보안 (PR #36·#37·#38)
- **인가 누락 차단 (CRITICAL, #36)**: forms/email/sms/artists/artworks/venues 모듈 server action이 클라이언트가 넘긴 `isAdmin`/`userId`로 인가를 판단 → 비로그인 외부인이 폼 PII 덤프·임의 이메일/SMS 발송·엔티티 삭제 가능했음. 모든 mutating·PII 액션에 `requireAdmin()` 적용, 클라이언트 인가 인자 제거. **Next.js server action은 미들웨어로 못 막으므로 액션 내부 가드 필수.**
- **재고 잠금 DoS (HIGH, #37)**: createOrder/createGoodsOrder가 결제 없이 재고 즉시 차감 + 만료/cleanup 부재 → 반복 호출로 영구 재고 소진. `reclaimStaleOrphanOrders`(TTL 15분, claim-then-decrement로 초과판매 방지) + 주문 생성 시 self-heal 호출. `mergeByKey`로 maxPerOrder 중복 라인아이템 우회 차단.
- **보안 헤더 (#38)**: next.config에 X-Frame-Options(DENY)/HSTS/nosniff/Referrer-Policy/Permissions-Policy(camera=self는 QR 스캐너용) + CSP frame-ancestors/base-uri/object-src 강제. 전체 리소스 CSP는 Report-Only 관찰 모드(라이브 결제/미디어 깨짐 방지, 위반 0 확인 후 enforce 승격).
- **시크릿 로테이션**: `.env.development`가 깃 히스토리에 커밋돼 COOKIE_PASSWORD/DATABASE_URL/Cloudflare 토큰 노출 → 3종 전부 로테이션. Neon 비번 reset 시 Vercel **Preview 스코프 env까지** 갱신 필요(미갱신 시 빌드 실패 — `/sitemap.xml`이 빌드타임 DB 조회).

#### 2. DB 인덱스 (PR #40)
- 인덱스 없는 FK 33개(Prisma는 Postgres FK 자동 인덱싱 안 함) → 부모→자식 조회가 전부 seq scan. 핫/성장 테이블 위주 26개 인덱스 추가(FormResponse/FormSubmission·OrderItem·Ticket·갤러리·홈 featured 등). prod main에 Neon MCP `run_sql_transaction`으로 적용 + `schema.prisma` `@@index` 동기화. userId 등 어드민·저트래픽 FK 12개는 의도적 스킵. 데이터가 작아 체감 속도보다 컴퓨트·확장성 대비 목적.

#### 3. 캐싱 + 편집 즉시 반영 (PR #39·#41~43)
- 홈 4섹션 + 저널(상세/목록/관련글) + 아티스트 상세 캐싱 추가(프로그램·아티스트 목록은 기존). 홈 featured 3종은 `Promise.all` 병렬화.
- **확립한 패턴**: `unstable_cache(fn, key, { revalidate, tags: ['domain'] })` + 편집 mutation에서 `updateTag('domain')`. → 트래픽엔 캐시 히트, 어드민 편집 시 즉시 무효화(read-your-own-writes). Next 16.2.4에서 동작 **프로덕션 검증 완료**(`revalidatePath`만으론 unstable_cache 무효화 안 됨).
- **직렬화 주의**: unstable_cache는 Date를 문자열로 직렬화 → 캐시 함수에서 ISO 변환하거나 wrapper에서 Date 복원. 소비 뷰가 `new Date(...)`로 감싸면 안전. 로케일 라벨/날짜 포맷은 캐시가 아닌 렌더 시점에(i18n 대비).

**리뷰 메모**: Gemini가 `updateTag`를 "next/cache에 없는 API"라며 매 PR critical 표시 → **오진**(16.2.4가 export, `cache.d.ts`/`cache.js` 확인 + 빌드·런타임 검증). CodeRabbit은 정확. 실제 유효 지적(저널 초안 유출·재고 회수 레이스·Date 직렬화)은 반영.

---

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
