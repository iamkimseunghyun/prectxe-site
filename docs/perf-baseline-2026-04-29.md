# 성능 Baseline — 2026-04-29

메이저 5개 의존성 업그레이드(zod 4 / prisma 7 / react-email 6 / solapi 6 / hookform-resolvers 5) 직후 baseline. **7/24 KLO×Nosaj 사전판매 오픈 직전 다시 측정해서 회귀 확인용**.

## 빌드 성능

| 항목 | 시간 | 비고 |
|---|---|---|
| **Cold build** (`.next` 삭제 후) | **20.86s** | wall time / 47.34s user CPU (멀티코어) |
| **Warm build** (incremental) | **15.03s** | `.next` 캐시 효과 ~5초 단축 |
| Prisma generate | 0.2s | client v7.8.0 |
| TypeScript check | 6.5s | 366 files |
| Next.js compile (Turbopack) | 4.7s | Next.js 16.2.4 |
| Static pages 생성 | 1.8s | 46/46 (9 workers) |

빌드 출력에 페이지별 First Load JS 사이즈 안 찍힘 — Next.js 16 Turbopack의 출력 변경. `.next/static/chunks` = **4.9MB** (CDN 캐싱 대상).

## 빌드 발견 사항

- ⚠️ **`middleware` 파일 deprecated** — Next.js 16에서 `proxy`로 마이그레이션 권장. 7/24 전엔 안 깨지나 다음 메이저(17)에서 제거될 가능성. 16.2 안에서 처리 권장.

## DB 상태 (Neon `calm-recipe-90482731` / main 브랜치)

### 테이블 사이즈 (상위 10)

| 테이블 | row | total size |
|---|---|---|
| FormResponse | 2,690 | 800 kB |
| FormSubmission | 390 | 184 kB |
| SMSRecipient | 224 | 104 kB |
| ProgramImage | 124 | 144 kB |
| FormField | 98 | 104 kB |
| Drop | 1 | 80 kB |
| TicketTier | 1 | 32 kB |
| Order | 2 | 96 kB |
| Ticket | 0 | — |

→ **DB 자체는 7/24 트래픽에 전혀 부담 없는 사이즈**. 이슈 발생 시 거의 항상 인덱스/쿼리 패턴 문제.

### Hot path 인덱스 ✅ 모두 OK

- `Order.accessToken` unique — 구매자 마이페이지
- `Order.orderNo` unique — 주문 조회
- `Order.status + createdAt` 복합 — 어드민 주문 페이지
- `Ticket.token` unique — QR 스캔
- `Ticket.orderId`, `Ticket.status` — 입장 처리
- `Payment.portonePaymentId` unique — webhook 처리
- `BankTransfer.orderId` unique
- `BankTransfer.status + expiresAt` 복합 — 만료 cleanup
- `Drop.slug`, `Article.slug`, `Program.slug` unique
- `DropMedia.dropId` — 미디어 갤러리

### FK 인덱스 누락 ⚠️ (트래픽 누적 시 잠재 병목)

| 테이블 | 누락된 인덱스 | 영향 받는 쿼리 |
|---|---|---|
| `TicketTier` | `dropId` | `/drops/[slug]` 페이지 — drop 상세 + 티어 목록 join |
| `GoodsVariant` | `dropId` | 상품 drop 상세 — 변형 목록 join |
| `OrderItem` | `orderId` | 주문 상세, 환불, 입장권 발급 |
| `Drop` | `status + publishedAt` 복합 | 공개 drop 목록 (status != 'draft' AND publishedAt != null) |

**현재는 row 수가 적어 풀스캔이라도 ms 단위로 끝남.** Year 1~2에서 누적 후(orders 1만건+, ticket tier/variant 누적) 노출됨. 7/24 직전엔 굳이 안 만들어도 OK, **2026 Q3 안에 마이그레이션 권장**.

### pg_stat_statements ❌ 미설치

- Neon default로 미설치. slow query log 못 뽑음.
- 설치 영향: 약간의 메모리 + 모든 쿼리 통계 수집(reversible: `DROP EXTENSION`)
- **추천**: 7/24 전 1~2주 트래픽 모일 때 설치해서 baseline 만들기. 사전판매 오픈 후 slow query 자동 surface.

## 회귀 회의 항목 (메이저 업그레이드 영향)

런타임 성능 회귀 의심 신호: 없음 (build success, 인덱스 OK, hot path 정상).

| 영역 | 상태 |
|---|---|
| zod 4 schema parsing | ✅ artwork year 회귀 1건 fix 완료 |
| prisma 7 client init | ✅ datasource 분리 정상, generate 0.2s |
| react-email 6 템플릿 렌더 | 측정 안 함 — 수동 smoke (`bank-transfer-pending`, `order-confirmation` 발송 1회) |
| hookform-resolvers 5 | 측정 안 함 — drop-form / form-builder / artwork-form 수동 클릭 |
| solapi 6 SMS 전송 | 측정 안 함 — `/admin/sms` 발송 테스트 1건 |

## Production Lighthouse (www.prectxe.com)

| 페이지 | Perf | A11y | BP | SEO | FCP | **LCP** | TBT | SI | **CLS** |
|---|---|---|---|---|---|---|---|---|---|
| `/` | **76** | 91 | 100 | 92 | 2,697ms | **5,037ms** ⚠️ | 7ms | 3,599ms | 0.000 |
| `/journal` | **94** | 91 | 100 | 100 | 997ms | 3,028ms | 7ms | 2,284ms | 0.000 |
| `/journal/max-cooper-3d-av-live-in-seoul-2026` | **61** ⚠️ | 91 | 100 | 92 | 955ms | **4,555ms** ⚠️ | 0ms | 3,538ms | **0.541** 🔴 |
| `/programs` | **73** | 91 | 100 | 100 | 2,878ms | **5,702ms** ⚠️ | 16ms | 3,788ms | 0.000 |

**Lighthouse 발견 사항 (우선순위 순)**:

🔴 **CLS 0.541 (article 페이지)** — 권장 0.1 미만의 5배 초과. 원인: footer가 본문 이미지 로드 후 툭 밀려남. 본문 이미지에 `width`/`height` 또는 `aspect-ratio` 미지정. Rich-editor가 출력하는 `<img>`에 dimension 명시 필요. **사용자 체감 가장 큰 약점**.

⚠️ **LCP 4.5~5.7초 (home, article, programs)** — 권장 2.5초 미만. 모바일 3G 시뮬레이션 기준이라 실제 wifi 사용자는 더 빠르지만, 7/24 사전판매 모바일 spike엔 critical. 원인 후보: hero 이미지 variant `hires`/`public` 사용 (Cloudflare Images), `priority`/`fetchpriority` 미지정, hero 비디오가 LCP 잡음.

⚠️ **FCP 2.7~2.9초 (home, programs)** — 서버 렌더 첫 데이터 fetch가 느릴 가능성. RSC로 Drop·Program 데이터 가져올 때 N+1 또는 cold connection. Neon 같은 region(icn1)이라 latency는 작아야 정상.

✅ **TBT 0~16ms / Best Practices 100** — JS 실행 부담·보안 헤더·HTTPS 모두 양호. **메이저 5개 업그레이드가 런타임 회귀 만들지 않았음 강력 신호**.

✅ **CLS 0.000 (article 외 모든 페이지)** — 레이아웃 안정. article 한 페이지 issue.

✅ **A11y 91 / SEO 92~100** — 전반 양호.

## TODO (다음 baseline 측정 전)

### 7/24 전 (high ROI, 1~2일 작업)

1. **🔴 Article body 이미지 dimension 명시** — Rich-editor에서 출력되는 `<img>`에 width/height 또는 `aspect-ratio` 자동 부여. journal 상세 CLS 0.541 → 0.1 미만 목표.
2. **⚠️ Hero LCP 최적화** — home/programs hero에 `<Image priority fetchPriority="high">` 적용 + Cloudflare variant `smaller` 또는 `public`(원본 미사용) 사용. 5s → 2.5s 목표.
3. **수동 smoke test 5종** — 이메일(`bank-transfer-pending`, `order-confirmation`) / SMS / 폼 / 결제 / QR 스캔. 메이저 업그레이드 후 회귀 잡기.

### 7/24 후 Q3

4. **FK 인덱스 4건 추가** — `TicketTier.dropId`, `GoodsVariant.dropId`, `OrderItem.orderId`, `Drop(status, publishedAt)`. 트래픽 누적 후.
5. **`middleware` → `proxy` 마이그레이션** — Next.js 16 deprecation. 다음 메이저 전.
6. **`pg_stat_statements` 설치** — 사전판매 트래픽으로 1~2주 baseline 모은 뒤 slow query 자동 surface.

### 다음 baseline 측정 시점

**2026-07-08 (사전판매 freeze)** — 위 1~3 반영 후 같은 4 페이지 Lighthouse + cold/warm build 시간 + DB 사이즈 diff. Article CLS 0.1 미만, LCP 2.5초 미만이 합격선.

## 비교용 환경 메타

- Bun 런타임, Next.js 16.2.4 (Turbopack), Prisma 7.8.0
- macOS Darwin 25.4.0, 멀티코어
- Vercel build region: icn1 (서울)
- 측정 머신: 로컬 (Vercel CI 환경과 다를 수 있음 — 7/8 측정 시 Vercel deploy 시간으로 비교 권장)
