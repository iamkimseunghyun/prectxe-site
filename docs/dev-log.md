# Development Log

> 이전 기록은 [dev-log-archive.md](dev-log-archive.md) 참조

## 2026-09-04

### 확정 메일 재발송 (drops/tickets)

"입금 확인을 눌렀는데 메일을 못 받았다"는 구매자가 가끔 있다. 어드민이 손으로 복구할 수단이 없었다.

**재발송을 `confirmBankTransfer` 재실행으로 만들면 안 된다.** 이 액션은 상태 전이 + 티켓 발급 + 메일을 한 덩어리로 하는데, `issueTicketsForOrder`는 호출할 때마다 **새 accessToken을 발급하고 Ticket row를 새로 만든다**. 재실행하면 티켓이 2배가 되고 먼저 보낸 링크가 죽는다. 통지는 상태 전이에서 떼어내 따로 반복 가능한 연산이어야 한다.

- `resendOrderConfirmation(orderId)` 신설 — paid/confirmed 주문만, 이미 저장된 `order.accessToken`을 읽어 같은 메일을 다시 보낸다. DB는 건드리지 않는다.
- 제목은 결제 수단에 따라 처음 나간 것과 동일하게(무통장 확정 → "입금 확인", 카드·무료 → `emailSubject`). 메일함에서 같은 건으로 보이게.
- 발송 로직을 `sendOrderConfirmationMail()`로 추출 — `verifyPayment`·`confirmBankTransfer`·재발송이 한 경로를 쓴다.

**함께 고친 것**: 기존 두 경로는 `sendEmail`을 `try/catch`로만 감쌌다. **Resend SDK는 API 에러를 throw하지 않고 결과 객체로 돌려주므로**(CLAUDE.md에 적어둔 함정) 422(잘못된 주소)·429가 전부 조용히 넘어갔고, 어드민은 "입금이 확인되었습니다" 토스트만 보고 지나갔다 — 아마 미수신 사례의 일부는 여기서 났다. 이제 `confirmBankTransfer`가 `emailSent`를 반환하고, 실패하면 어드민에게 재발송을 안내한다.

**남은 한계**: Resend가 접수(202)한 뒤의 스팸함·바운스는 여전히 보이지 않는다. 주소 오타면 재발송해도 같은 곳으로 간다 — 주소 수정 후 발송, 또는 입장권 링크 복사(카톡·문자 직접 전달)가 다음 후보.

**검증**: type-check·biome·`next build` 통과. 프로덕션 재발송 동작은 배포 후 확인 필요.

---

## 2026-09-03

### 응답 있는 필드 편집 경고 (forms)

#84 사후 조사에서 드러난 갭 — 라벨/유형을 바꾸면 과거 응답이 새 기준으로 소급 표시되는 문제 — 에 대한 대응.

**세 선택지 중 3번을 골랐다.**

1. 그대로 두고 운영 규칙으로 커버
2. `pickValue`가 스냅샷 라벨을 1급으로 써서 컬럼 분리
3. **편집 시 경고만** ← 채택

2번은 정확하지만 **흔한 행위(오타·표현 수정)에 비용을 물린다** — `"이름 "` → `"이름"` 같은 정리에도 컬럼이 갈라진다. 실제 위험은 "필드 재활용"이라는 드문 행위인데, 코드가 둘을 구분할 방법이 없다. 사실만 알리고 판단은 사람에게 맡기는 쪽이 맞다.

- `getForm`이 필드별 응답 수를 함께 반환(`_count: { responses: true }`). `FormResponse.fieldId`에 인덱스가 있어 필드당 count는 싸다.
- 편집 페이지가 `fieldResponseCounts`를 빌더에 넘기고, 빌더는 `initialData`에서 원래 라벨·유형 맵을 만들어 편집기에 내린다.
- 응답이 있는 필드: 조용한 안내("기존 응답 N건이 연결돼 있습니다").
  라벨·유형이 **바뀌면** amber 경고 + 올바른 우회로 안내 — **"다른 질문으로 바꾸는 거라면 이 필드를 삭제하고 새 필드를 추가하세요"**(삭제하면 archive되므로 과거 응답이 원래 질문 아래 남는다).
- 신규 생성 화면은 `original`이 undefined라 경고가 뜨지 않는다.

**검증**: type-check·biome 통과. 중첩 `_count` 쿼리는 앱 prisma 싱글톤으로 실제 실행해 확인. **프로덕션에는 active 필드에 달린 응답이 0건이라 경고가 뜰 폼이 없다** — 앞으로 들어올 응답부터 동작한다. 로컬 dev 브랜치의 `Event Registration Test`(5개 필드 각 1건)로 육안 확인 가능.

---

## 2026-09-02

### Forms 모듈 전수 점검 (PR #82~#90)

9건. 공개 렌더 누락 → 데이터 유실 → 보안 하드닝 → 구조 정리 순으로 진행. 저장 때마다 필드가 갈리던 #84가 이 중 가장 컸다.

#### 1. 공개 렌더러에 없던 필드 타입 + 검증 버그 3건 (#82)
- 빌더의 필드 타입 목록과 미리보기에는 URL·파일이 있는데 **공개 렌더러에 두 분기가 없었다.** 어드민이 해당 필드를 만들면 공개 폼에 입력칸이 뜨지 않고, 필수로 걸어둔 경우 제출 자체가 불가능.
- URL은 `type="url"`, 파일은 `FormFileField` 신설 — 선택 즉시 Cloudflare Images 업로드 후 성공한 URL만 값으로 넘기고, 업로드 중에는 제출을 막는다. Cloudflare Images는 이미지만 받으므로 라벨도 '파일 업로드' → '이미지 업로드'.
- `getFormFileUploadUrl`: 게시된 폼의 살아있는 file 필드인지 확인한 뒤에만 업로드 URL 발급(기존 `getCloudflareImageUrl`은 어드민 전용 무가드 액션이라 재사용 불가). 제출 시 file 값이 우리 Cloudflare Images URL인지 서버에서 재확인.
- 함께 고친 검증 버그: `defaultValue`가 `''`인데 `.optional()`은 undefined만 허용해 **선택 항목을 비우면 email/phone/date/url이 전부 제출 차단**(단 checkbox/multiselect 배열 필드는 `''`를 받지 않는다) / 숫자 필드의 `.min(1)`은 "길이 1 이상"이 아니라 "값이 1 이상"이라 0·음수·소수를 반려 / 업로드 오류가 스크린리더에 미전달(`role="alert"`).

#### 2. 공개 폼 레이아웃 밀도 (#83)
프로덕션 폼(필드 6개)이 모바일에서 4.4화면 분량이었다. 필드 수가 아니라 필드마다 카드를 두르고, 선택지마다 테두리 박스를 주고, 긴 안내문이 heading 스타일로 렌더된 탓.

측정(모바일 390px, 프로덕션과 같은 모양의 폼):

    전체 문서   3725px → 3219px  (-13.6%, 4.4화면 → 3.8화면)
    활동 분야    943px →  821px  (선택지 18개, 폼 높이의 45%였음)
    동의 레이블  330px →  273px  (16px/500 → 14px/400)

- 필드별 카드(p-6 + border + shadow + hover) → 카드 하나 + 구분선. 제출 버튼 카드도 제거.
- 선택지: 테두리 박스 → 평범한 행 + `text-sm`. 탭 영역은 label을 행 전체로 유지(310×35px), 열 간격은 `gap-x-6`으로 따로 줘서 데스크톱 2열이 붙지 않게.
- **레이블 80자 초과 시 본문 스타일로 강등** — 동의 문구를 label에 통째로 넣는 폼이 있다(라이브 폼 461자).
- Playwright로 모바일/데스크톱 렌더·선택지 토글·헤더 겹침 실측. CodeRabbit은 rate limit으로 미수행.

#### 3. 저장마다 전 필드가 archive되던 문제 (#84) ★
- 편집 페이지가 DB id에 `field-` 접두사를 붙여 넘겼고, 빌더는 그 접두사를 **신규 필드의 임시 id 표식**으로 썼다. 결과적으로 기존 필드 id가 전부 제거된 채 서버로 가서, 매 저장마다 기존 필드를 archive 하고 새로 만들었다.
- **PR #63(7/22)에서 같은 증상을 한 번 고쳤지만 빌더 쪽만 고쳤고, 편집 페이지가 접두사를 붙이는 한 무력화된다.** 규칙이 두 파일에 흩어져 있던 것이 재발 원인.
- 프로덕션 실측: CURRENT 폼 활성 6 / archived 61, 응답 100%가 archived 필드를 가리킴(721/721). 라벨 8개에 field id 17개.
- 필드 id 보존 + 규칙을 `toFieldPayload()`로 분리(순수 함수). `updateForm`의 메타 갱신/archive/upsert를 단일 트랜잭션으로(timeout 15s).
  - ※ #84 커밋 메시지는 "테스트 추가"라고 적었지만 **테스트 파일은 없다** — 프로젝트에 테스트 프레임워크 자체가 없다. 함수 분리까지가 실제 변경.
- 함께: 제출시간 정렬을 표시 문자열이 아닌 원본 timestamp로('9월' > '10월' 버그) / 체크박스 응답 JSON 원문을 표·상세·CSV·Excel에서 사람이 읽는 형태로 / 폼 데이터를 통째로 찍던 `console.log` 제거 / 신규 필드 임시 id를 `crypto.randomUUID()`로(같은 ms 중복 방지).
- **과거에 흩어진 응답은 복구되지 않는다.** submissions-view의 라벨 그룹핑은 기존 데이터를 계속 보여주기 위해 유지.

**사후 조사 (9/3)** — "archive가 원래 의도였던 것 아닌가"라는 지적이 나와 전수 확인했다. 결론: **이력 보존 설계는 3겹이고 #84는 그중 무엇도 건드리지 않았다.**

| 겹 | 장치 | 도입 | #84 영향 |
|---|---|---|---|
| 1 | `FormField.archived` (물리 삭제 금지) | 2026-02-11 `1e05f05` | 없음 |
| 2 | `FormResponse.fieldId` + `onDelete: SetNull` | 2026-01-24 `a47669e` | 없음 |
| 3 | `FormResponse.fieldLabel`·`fieldType` 스냅샷 | 2026-01-24 `a47669e` | 없음 |

`a47669e` 커밋 메시지에 의도가 명시돼 있다 — *"Support Google Forms-like flexibility: free field modification without data loss"*. `updateForm`은 지금도 빌더에서 빠진 필드를 archive만 한다.

**#84가 없앤 건 "매 저장마다 전 필드 무차별 재생성"뿐이다.** 그건 이력 장치가 아니라 편집 페이지가 DB id에 접두사를 붙여 생긴 버그였다 — 라벨을 안 바꾸고 저장 버튼만 눌러도 갈렸으니, 이력 보존이 목적이었다면 변경된 필드만 갈렸어야 한다.

프로덕션 응답 2,935건 전수(9/3):

    fieldLabel 스냅샷 누락        0
    스냅샷 라벨 ≠ 현재 라벨        0
    archived 필드를 가리킴     1,749
    fieldId 유실(고아)         1,186
    active 필드를 가리킴           0

- 스냅샷이 100% 살아있어 **모든 응답이 지금도 정상 표시된다.**
- 고아 1,186건은 제출일이 전부 **1/24~2/11**, 즉 스냅샷 도입과 soft delete 도입 **사이 구간**이다. 그 시기엔 필드 편집이 물리 삭제였고 `SetNull`이 발동했다. 2/11 이후 고아는 0건이고 코드에 `formField.delete` 호출은 없다 — **이미 닫힌 문제.**
- `active 필드를 가리킴 = 0`은 #84 이전 피해의 크기다. 현재 살아있는 필드에 붙은 과거 응답이 하나도 없다.

**남은 갭**: 응답 표는 컬럼을 **현재** 필드 라벨로 묶는다(`buildColumns`/`pickValue`는 `fieldId`가 살아 있으면 스냅샷을 보지 않는다). 라벨을 바꾸면 과거 응답이 새 라벨 아래로 소급 이동한다. 오타 수정이면 맞는 동작이고, **필드를 다른 질문으로 재활용할 때만 오염**이다(예: '이메일' 필드를 '전화번호'로 변경). #84 이전엔 새 세대가 생겨 컬럼이 갈라졌는데 지금은 안 갈라진다. → 9/3 경고 UI로 대응(위 엔트리).

#### 4. 공개 제출 경로 하드닝 (#85)
- `submitFormResponse`가 `ipAddress`/`userAgent`를 **인자로** 받았다. 서버액션은 공개 RPC라 호출자가 아무 값이나 넣을 수 있어 어드민에 보이는 IP가 위조 가능했고, 이를 근거로 한 제한은 무엇이든 우회됐다. 액션이 직접 헤더를 읽도록 바꾸고 공개 폼 페이지의 래퍼 액션을 걷어냈다.
- `getClientIp`를 `lib/rate-limit/client-ip`로 공유(email 모듈과 근거 통일). 제출 50회/시간, 업로드 URL 발급 40회/시간(IP당).
- `ZodError.message`(issues JSON) 대신 스키마의 한국어 메시지. Prisma P2002 → '이미 사용 중인 URL 슬러그입니다'. 제출/복사 catch에서 내부 에러 원문 노출 제거.

#### 5. 전수 점검 3차 — 읽기 쿼리 분리 외 6건 (#86)
- `getFormBySlug`/`getForm`/`listForms`/`getFormSubmissions`가 전부 서버 컴포넌트에서만 호출되는데 액션 파일에 있어 각각 **공개 RPC 엔드포인트**가 되어 있었다. 특히 `getFormSubmissions`는 응답자 PII 전체를 반환한다. `server/queries.ts`로 분리하고 클라이언트가 직접 부르는 것만 액션에 남겼다.
- 없는 폼 id → redirect(소프트 404) 대신 `notFound()` / `?status=bogus`가 검증 없이 Prisma where로 들어가던 문제 / 제출 검색이 내부 cuid까지 매칭해 오탐 / CSV 내보내기 `URL.createObjectURL` 미해제 / 삭제 확인창에 제출 건수 표시 / 필드 편집기 삭제 버튼·드래그 핸들 접근명(핸들은 dnd-kit 권장대로 button으로).

#### 6. 폼 제출 시 IP·UA 수집 중단 (#87)
- 저장해도 쓰는 곳이 없었다. rate limit은 요청 헤더에서 직접 읽으므로 DB의 IP가 필요 없고, 저장된 IP의 유일한 용도는 어드민 표 표시였다. userAgent는 아예 어디에도 표시되지 않았다. **폼 동의문에도 IP 수집은 고지돼 있지 않다.**
- `getFormSubmissions`를 include → 명시 select로. include는 스칼라를 전부 끌고 와 두 컬럼이 브라우저까지 갔다.
- 제출 목록 IP 컬럼·정렬, 상세 모달 IP 블록, CSV/Excel 익스포트 IP 제거. **컬럼은 nullable 그대로 뒀다**(스키마 변경은 prod 마이그레이션이라 별건).

#### 7. 응답 내보내기를 서버 라우트로 + xlsx 제거 (#88)
- 브라우저에서 xlsx로 파일을 만들던 걸 `/api/admin/forms/[id]/export`로 이동. drops 주문 내보내기와 같은 모양.
- **CSV 수식 인젝션 방어** — 폼 응답은 외부인이 채우는 값이라 `=`로 시작하는 답변이 어드민 엑셀에서 수식으로 실행될 수 있었다.
- 한글 파일명 `Content-Disposition` 안전 처리(`filename=` ASCII 폴백 + `filename*=` UTF-8 퍼센트 인코딩). **7/02 #59와 같은 함정** — 그때는 PnL 쪽이었고 Vercel undici에서만 크래시했다.
- xlsx 0.18.5 제거. CVE는 파싱 경로라 우리 사용엔 해당 없지만 npm 배포가 중단된 패키지를 남겨둘 이유가 없다.
- 공유 모듈 2개 신설: `lib/export/spreadsheet`(AOA 기반 CSV/XLSX 직렬화 + 파일명 — drops에만 있던 것을 옮기고 drops도 이걸 쓴다), `lib/forms/submissions-table`(컬럼 그룹핑·행 변환 — 화면과 내보내기가 같은 규칙을 써야 하는데 뷰 컴포넌트 안에만 있었다).

#### 8. 도움말 줄바꿈 (#89 → #90)
- `helpText`만 `whitespace-pre-wrap`이 빠져 여러 줄로 쓴 안내가 한 문단으로 붙었다(#89). 같은 페이지의 body는 이미 pre-wrap을 쓰고 있었다.
- 그런데 정작 어드민 입력이 한 줄짜리 `Input`이라 줄바꿈을 넣을 방법 자체가 없었다 → `Textarea`로 교체(#90). 렌더만 고치고 입력을 안 본 반쪽짜리였다.
- 계기: 라이브 폼의 개인정보 수집·이용 동의 안내가 항목을 '·'로 구분해 한 줄에 붙어 있다.

#### 남은 과제
- 제출 목록 페이지네이션, 공개 read 캐싱 (#86에서 보류).
- IP·UA 컬럼 실제 DROP(prod 마이그레이션 별건).
- #84 이전에 흩어진 응답 데이터 — 복구 불가, 라벨 그룹핑으로 표시만 유지 중.

---

## 2026-09-01

### Email 모듈 재작업 + 미사용 기능 제거 (PR #73~#81)

Resend 발송 경로가 실패를 감지하지 못하던 것이 출발점. 발송 성능·안전장치·수신 거부까지 이어졌다. (#77은 #80으로 다시 열어 머지)

#### 1. 홈 매진 드랍 노출 (#73)
- 홈 Drops 섹션이 매진 드랍을 필터로 걷어냈다. 드랍이 1~2개인 평소 상태에선 매진 즉시 섹션이 통째로 사라져 "아무것도 안 하는 사이트"로 읽히고, 구매자가 공연 정보를 다시 찾을 경로도 없어진다. **히어로 섹션은 이미 매진 drop을 남기고 CTA만 "매진"으로 바꾸고 있어 같은 페이지 안에서 두 섹션의 철학이 반대였다.**
- 필터 → 정렬로 교체(`on_sale` > `upcoming` > `sold_out` 상위 3개). `take(12)` 절단 이슈도 해소. `closed`는 계속 제외.
- `sold_out` 배지 톤 중립화(빨강은 에러로 읽힘). 매진 카드의 판매 마감 카운트다운 숨김 — 판매창은 열려 있고 재고만 소진된 드랍에서 "Sold Out" 아래 마감 티커가 도는 모순(기존엔 필터돼 도달 불가였던 경로).
- eyebrow "Now Available" → "Limited Runs". 나머지 4개 섹션 eyebrow는 분위기를 까는 말인데 이것만 사실 주장이라 매진 시 거짓이 됐다.

#### 2. PnL·Estimates 기능 제거 (#74)
프로덕션 데이터 확인 후 삭제(3,585줄 + 관련 라우트/스키마, 총 -4,844줄):
- Estimate 0건, SupplierProfile 0건, EstimateCounter 0건 → 견적서는 5개월간 한 번도 발행된 적 없고 전제조건인 공급자 정보조차 입력된 적 없다.
- PnLTemplate 0건, PnLSheet 1건(2026.07.24 KLO × Nosaj Thing, 마지막 수정 7/02) → 7월 공연 준비 때 한 번 쓰고 방치. **삭제 전 별도 백업 완료.**
- 필요 자체는 유효하나 인앱 스프레드시트/발행기가 손에 익은 구글 시트·독스와 경쟁해 실사용을 얻지 못했다. **아무도 실행하지 않는 admin server action은 인가 가드가 깨져도 감지되지 않는 표면으로 남는다**(6월 보안감사 C1 참고) — 유지 비용이 0이 아니다.
- Prisma 모델 5개 + User 역관계 3개 제거. 프로덕션 테이블 DROP은 별도 수행(main 브랜치 drift로 `prisma db push` 불가).

#### 3. 발송 실패가 전부 성공으로 집계되던 문제 (#75) ★
- **Resend SDK(6.x)의 `fetchRequest`는 모든 API 실패를 catch해서 `{data: null, error}`로 반환하고 throw하지 않는다.** `sendEmail`은 try/catch로만 성공을 판정해 429·422·403·네트워크 실패가 전부 `success: true`로 기록됐다. 어드민엔 "N건 발송 성공"이 뜨고 `EmailRecipient.error`는 항상 비어 있어 stats의 `errorBreakdown`이 영구히 빈 배열이었다. **같은 경로를 타는 주문 확인·입금 안내 메일도 실패가 로그에 전혀 남지 않았다.**
- `response.error`를 명시 검사 + 로그. 성공 판정을 `sentCount > 0` → `failedCount === 0`으로 정정(500명 중 1명만 성공해도 "성공"으로 보고되던 문제).
- `subscribeNewsletter`는 인증 없는 공개 액션인데 호출 1회당 Resend API를 최대 3회 부른다. **Resend rate limit은 팀당 10 req/s를 모든 API 키가 공유**하므로 구독 폼 폭주가 결제 경로의 주문 확인 메일까지 끌어내릴 수 있었다 → 인메모리 슬라이딩 윈도우 limiter(`lib/rate-limit/memory.ts`, IP 10회/시간·동일 주소 1회/24시간, 의존성·env 추가 없음).
- `alreadySubscribed` 반환 제거 — 구독 여부를 외부에서 조회할 수 있는 **열거 오라클**이었다.
- `{{{RESEND_UNSUBSCRIBE_URL}}}`은 Broadcasts 전용인데 어드민 UI에서 newsletter 템플릿을 골라 `emails.send` 경로로 보낼 수 있어 **치환되지 않은 죽은 링크가 발송**됐다 → 템플릿에 `unsubscribeUrl` prop, 없으면 링크 미렌더. 독립·Form 발송에서 템플릿 선택 제거(form-notification 고정), 뉴스레터는 브로드캐스트 탭으로 일원화.

#### 4. batch 발송 + 입력 검증 + 수신자 서버 조회 (#76)
- 수신자마다 개별 API 요청 + 매번 템플릿 재렌더 → 500명이면 호출 500회·렌더 500회. rate limit 예산을 혼자 쓰며 결제 메일을 밀어냈고 수천 명이면 함수 실행 시간 한계.
- `resend.batch.send`로 100건씩 묶어 **호출 500회 → 5회**, 템플릿은 1회만 render.
- `batchValidation: 'permissive'` — strict(기본값)는 잘못된 주소 하나가 청크 전체를 실패시킨다. permissive는 `errors[{index,message}]`로 실패분만 돌려주므로 index를 요청 배열과 매핑해 수신자별 성패 유지(`data[]`는 성공분만 담기므로 커서 매핑하되, 길이가 어긋나면 messageId만 포기하고 성패는 `errors[]`를 신뢰).
- 청크 간 150ms 간격. `idempotencyKey`에 `campaign.id`를 넘겨 타임아웃 후 재실행 시 중복 발송 방지.
- **입력 검증 부재(프로젝트 컨벤션 위반)**: 서버 액션에 zod가 전혀 없어 수신자 수·본문 길이 상한이 없었고 template이 런타임 검증되지 않아 잘못된 값이 조용히 폴백 → `lib/schemas/email.ts` + `parseInput`. 수신자 2000명·본문 200KB 백스톱.
- **수신자를 클라이언트가 결정하던 문제**: Form 발송이 응답자 주소 전체를 브라우저로 내려보낸 뒤 그대로 되돌려 받아 발송했다(PII 왕복 + 수신자 목록 조작 가능) → `source: 'form' | 'manual'` discriminated union, form이면 서버가 formId로 직접 조회. `getFormRespondentsEmails` → `getFormRespondentsSummary`(카운트만 반환, 실제 조회는 export하지 않는 내부 헬퍼).
- `EmailRecipient`를 `createMany` 한 번으로(예전엔 `Promise.all`로 수신자 수만큼 동시 INSERT → 커넥션 풀 고갈). `EmailCampaign` 인덱스 3개(userId·formId·sentAt) — 6/19 FK 인덱스 일괄 추가 때 이 모델만 누락돼 pkey밖에 없었다. `filterValidEmails` 중복 제거를 indexOf(O(n²)) → Set.

#### 5. 에디터 툴바 버튼이 폼을 제출하던 문제 (#78)
- 이메일 에디터 툴바·이미지 제어 버튼 27개에 `type`이 없어 HTML 기본값 submit으로 동작. 세 발송 폼 모두 `EmailEditor`를 `<form>` 안에 둬서 **Bold·H1·정렬을 누르면 폼이 제출됐다** — 독립/Form 발송은 확인창 없이 즉시 전체 발송.
- 수신자·제목을 채운 뒤 본문을 쓰다 서식 버튼을 누르는 것이 일반적 흐름이라 **되돌릴 수 없는 발송이 실수 한 번에 나갈 수 있었다.**
- **PR #53(6/21)에서 같은 버그를 `components/rich-editor/`에서 고쳤지만 90% 복제본인 `modules/email/ui/components/email-editor/`는 누락**돼 있었다(rich-editor 28/29 명시 / email-editor 0).
- 근본 원인은 shadcn `Button`이 type 기본값을 주지 않는 것 + 에디터 복제 — 둘 다 별도 과제로 남김(#53에서도 "전체 폼 audit 선행 필요"로 남긴 항목).

#### 6. 수신 거부 라우트 + List-Unsubscribe 헤더 (#80)
- 단체 메일에 수신 거부 수단이 없었다. **정보통신망법상 광고성 정보에는 수신거부 방법 명시가 의무**이고 Gmail·Yahoo는 List-Unsubscribe를 발신 평판에 반영한다.
- **HMAC 서명 토큰**(`lib/email/unsubscribe.ts`) — 구독자 모델이 자체 DB에 없고(Resend 소유) 이미 발송된 메일의 링크는 몇 년 뒤에도 동작해야 하므로 DB 조회 없이 검증되는 무상태 토큰. 만료 없음. 키는 `UNSUBSCRIBE_SECRET`, 없으면 `COOKIE_PASSWORD`에서 도메인 분리 파생 — **세션 시크릿 로테이션 시 기존 링크가 전부 깨지므로 별도 env 권장**(CLAUDE.md 명시).
- `POST /api/unsubscribe?t=` — RFC 8058 원클릭(page.tsx는 POST를 못 받으므로 라우트 핸들러). `GET /unsubscribe?t=` — 사람이 클릭하는 확인 페이지. **여기서 바로 해지하지 않는다**: 메일 클라이언트·보안 스캐너의 링크 프리페치(GET)로 의도치 않은 해지가 일어난다. 토큰이 깨졌으면 주소 직접 입력 폼으로 degrade.
- 템플릿은 수신자 전체에 1회만 렌더하므로(#76) 본문에 수신자별 URL을 직접 넣을 수 없다 → `UNSUBSCRIBE_URL_PLACEHOLDER`를 심고 `sendEmail`이 수신자별로 치환(Resend가 Broadcasts에서 쓰는 방식과 동일).
- **거래 메일에는 붙이지 않는다** — 주문 확인·입금 안내에 수신 거부를 달면 구매자가 영수증 수신을 해지하는 셈. 테스트로 회귀 방지.

#### 7. 발송 안전장치 + 작성 내용 보존 + UI 정리 (#79)
- **작성 중이던 본문이 사라지던 문제**: Radix `TabsContent`가 비활성 탭을 언마운트해 탭 이동만으로 폼 상태와 TipTap 인스턴스가 통째로 파괴됐다 → `useEmailDraft` 훅(localStorage 디바운스 자동 저장 + 복원, 새로고침·브라우저 종료까지 커버). TipTap은 content를 초기값으로만 쓰므로 복원 시 `editorKey`로 재마운트. **언마운트 시 미저장분을 flush** — 탭 전환이 곧 언마운트라 타이머만 지우면 마지막 500ms 입력이 사라져 원래 증상이 남는다. localStorage는 렌더 중이 아니라 effect에서 읽는다(hydration 불일치 방지).
- **되돌릴 수 없는 발송의 안전장치**: 확인 단계가 브로드캐스트에만 있었다 → `SendControls`로 세 경로 모두 확인 다이얼로그(대상·인원 명시). `sendTestEmail` + "내게 테스트 발송" — 에디터는 웹용 prose로 보이지만 실제 메일은 인라인 스타일 + 템플릿 래퍼로 렌더되고 YouTube는 썸네일+링크로 변환된다(**보이는 것과 나가는 것이 달랐다**). 캠페인 이력은 남기지 않는다.
- 브로드캐스트는 수신자를 Resend가 관리해 `sentCount`가 0인데 목록이 "발송완료 0건"으로 보여줘 실패처럼 읽혔다 → 숫자를 지어내는 대신 "Resend 관리"로 표시(Segment·Broadcast 어디에도 수신자 수가 없음, SDK 타입 확인). 템플릿 컬럼('알림' 고정이라 무의미) → '발송 방식'. `listEmailCampaigns` 페이지네이션(20건).
- `convertToEmailHTML`이 `/<p>/g`처럼 속성 없는 태그만 매칭해 TextAlign이 만든 `<p style="text-align: center">`는 margin·line-height가 통째로 누락됐다(정렬한 문단만 간격이 어긋나는 증상) → 기존 style 보존 병합. base64 이미지 차단(붙여넣기 한 번에 본문이 수 MB가 되어 DB body와 발송 페이로드에 그대로 실렸다).
- 아이콘 버튼 23개 `aria-label`(접근 이름이 없었다), 토글 11개 `aria-pressed`. 기본 탭을 통계 → 구독자 전체 발송. "독립 발송" → "주소 직접 입력".
- `RESEND_SEGMENT_ID`로 세그먼트 고정 지원 — 자동 탐지는 모듈 캐시라 무효화 경로가 없고(삭제·개명 시 재배포 전까지 발송 불가) 콜드 인스턴스 동시 기동 시 중복 생성될 수 있다. `segments.list` 전 페이지 순회도 수정.
- metadata title 중복 수정(8개 파일) — 루트 layout의 template `'%s | PRECTXE'`가 있는데 페이지가 접미사를 또 붙여 "이용약관 | PRECTXE | PRECTXE"로 렌더됐다(기존 버그, 로컬 실행 중 발견).

#### 8. 캠페인 상세 화면 + 실패분 재발송 (#81)
- 발송 결과를 확인할 방법이 없었다. 결과는 toast로 5초 뜨고 사라졌고 "12건 실패"가 누구인지 볼 화면이 없었다. `getEmailCampaign`은 아무도 호출하지 않는 데드코드였다.
- 목록 행 클릭 → 다이얼로그(키보드 Enter/Space + aria-label). **본문 미리보기는 iframe sandbox로 격리** — 이메일 HTML을 어드민 DOM에 직접 주입하면 본문의 전역 스타일이 관리 화면을 덮어쓰고 스크립트가 섞이면 그대로 실행된다.
- 수신자 목록: 실패 우선 정렬(상세를 여는 이유가 대개 실패 확인) + 사유 표시 + "실패만" 필터 + 50건 페이지네이션. `recipients` 무제한 include를 교체(수천 명 캠페인이면 응답에 전부 실렸다).
- **실패분 재발송**: 새 캠페인을 만들지 않고 기존 `EmailRecipient` 행을 갱신(행이 늘면 집계가 실제 수신자 수와 어긋난다). 집계는 증가가 아니라 **재계산**(증가 방식은 재발송을 반복할수록 드리프트). 한 주소에 행이 여럿일 수 있어 id를 배열로 모은다(`Map<string,string>` 하나면 마지막 id만 남아 나머지 행이 영영 실패로 굳는다). **`idempotencyKey`를 쓰지 않는다** — 재발송은 "실패한 것을 다시 시도"라 Resend가 중복으로 걸러내면 안 된다. 연타 방지는 캠페인별 30초 쿨다운.
- 브로드캐스트는 수신자를 Resend가 관리하므로 재발송 대상에서 제외.

#### 범위에서 뺀 것
- **예약 발송**: `EmailCampaign.scheduledAt` 컬럼이 필요한데 Neon MCP 세션이 끊겼고 로컬 `.env`의 `DATABASE_URL`이 낡은 sqlite 경로라 마이그레이션 불가.
- **오픈율·바운스**: Resend 웹훅 엔드포인트 + 이벤트 저장 스키마 + svix 서명 검증 필요.

---

## 2026-08-31

### 아티스트 영역 전수 점검 + 사이트 전역 404 복구 (PR #68~#72)

- **아티스트 영역 일괄 개선 (#68)**: draft 프로그램 노출·'더 보기' 무동작·편집 페이지 인가 누락 3건 수정. Cloudflare flexible variants 로더 도입으로 **srcset 복구**(`unoptimized`로 `sizes` 22곳이 무시되던 상태), Suspense 스트리밍 정상화, 불필요 조인·중복 쿼리 제거, 캐시 태그 정합성. 접근성(heading 레벨·라이트박스 포커스·터치 기기 제목·breadcrumb·skip link). 읽기 쿼리를 `'use server'` 밖으로 분리.
- **참여 Drops 섹션 (#69)**: `Artist.dropCredits`가 스키마에만 있고 미사용이라 아티스트 참여 공연/굿즈가 상세에 안 뜨던 것 추가. 공개 조건은 listDrops와 동일(`publishedAt IS NOT NULL`), 캐시 태그에 `drops` 추가. `animate-spin` 17개 파일을 `motion-safe:`로 게이트.
- **사이트 전역 404 복구 (#71)** ★: **루트 `loading.tsx`가 전 라우트를 Suspense로 감싸 shell이 200으로 먼저 flush**되면서 모든 동적 상세 라우트가 404 대신 200을 반환하고 있었다. journal/programs 상세는 소프트 404를 렌더 중. → `loading.tsx` 3개 제거하고 리스트 스트리밍을 페이지 내부 Suspense로 이전, 소프트 404 → `notFound()`, `artwork-list-view`의 죽은 Suspense 수정.
- **문서 (#70·#72)**: CLAUDE.md의 Drop 상태 모델을 실제 구현에 맞게 정정(status 컬럼은 없고 `getEffectiveDropStatus()`가 파생, 저장하지 않는 이유와 Program #65~#67 선례). 위 점검에서 나온 반복 실수를 **새 목록/상세 페이지 체크리스트** 15항목으로 정리 — 특히 타입체크·린트를 통과해 눈에 안 띄는 두 가지(세그먼트 `loading.tsx`가 `notFound()`의 404를 막는 것, 부모에서 `await` 후 props 전달 시 Suspense가 suspend되지 않는 것).
- Vercel Analytics 삽입, 성능 수정 일부(PR 없이 직접 커밋 2건).

---

## 2026-07-28

### Program을 아카이브 전용으로 단순화 (PR #65~#67)

- `Program.status`는 수동 저장 enum이라 기간이 끝나도 `completed`로 갱신하지 않으면 `upcoming`으로 남는다. 홈 upcoming 섹션·featured-hero 폴백에 날짜 가드 추가(#65), 이어서 `getEffectiveProgramStatus` 날짜 기반 파생 도입(#66).
- 결국 **Program을 지난 이벤트 아카이브 전용으로 확정**(#67) — 다가오는 소식은 Journal, 판매는 Drops. 공개 뷰의 upcoming 관련 로직 전부 제거, 공개 목록은 status 구분 없이 draft만 제외(-391줄).
- **이 3연속이 "시간이 흐르면 저장된 상태는 반드시 드리프트한다"의 근거 사례** — 이후 Drop 상태를 저장하지 않고 파생하기로 한 결정의 선례가 됐다(#70 참조).

---

## 2026-07-22

### Forms 필드 archived 누적 (PR #63~#64)

- 폼 빌더가 저장 시 **모든 필드의 id를 제거**해 `updateForm`이 기존 필드를 매번 새 필드로 인식 → archive + create 반복. 동일 라벨의 빈 archived 필드가 쌓이고 응답 화면에 중복 컬럼으로 노출됐다. 빌더가 신규 필드 임시 id(`field-<ts>`)만 제거하도록 수정.
- **이 수정은 절반이었다** — 편집 페이지가 DB id에도 같은 접두사를 붙이고 있어 9/2 #84에서 재발이 확인됐다.
- 동의문처럼 긴 라벨이 응답 화면 헤더를 세로로 늘리던 문제 → `max-w-200px` + `line-clamp-2`, 전체는 title(hover) (#64).

---

## 2026-07-09

### Journal 상세·에디터 UX (PR #61~#62)

- `BackButton` 히스토리 없을 때 `fallbackHref` 폴백 + 고정 헤더에 클릭이 가로채이던 z-index 버그 수정. `Article.views` 컬럼 추가 + 공개 상세 조회 시 집계(캐시 무효화 없이 raw write), 어드민 목록에만 노출. 저장 중 버튼 비활성화.
- "업로드 재시도" 버튼에도 저장 버튼과 동일한 로딩 가드(single-use 업로드 URL 재사용 방지). `submit()` catch 추가 — `onSubmit`이 감싸지 않은 예외를 던지면 토스트 없이 조용히 실패했다. `redirect()`가 던지는 `NEXT_REDIRECT`는 `isRedirectError`로 구분해 재throw.

---

## 2026-07-02

### 내보내기 크래시 + biome 정리 (PR #58~#60)

- PnL 엑셀 내보내기가 **프로덕션에서만** 500이고 에러 응답이 파일로 저장돼 "txt 에러"처럼 보였다. 처음엔 `exceljs`를 `serverExternalPackages`에 추가(#58)했으나 이는 레드 헤링.
- **실제 원인(Vercel 런타임 로그로 특정)**: 시트명의 `×` 같은 **비ASCII가 `Content-Disposition`의 `filename="..."`에 그대로 들어가고 Vercel(undici)이 헤더를 엄격 검증해 `TypeError: Header has invalid value`로 함수 크래시** → text/plain 에러 → 브라우저가 `export.txt`로 저장. 로컬(bun/구버전 undici)은 관대하게 허용해 재현 불가. `attachmentDisposition()` 헬퍼로 ASCII 폴백 + `filename*=` UTF-8 (#59).
- biome 경고/에러 0 정리 — import/export 정렬, 미사용 심볼 제거 76개 파일, 로직 변경 없음 (#60).

---

## 2026-06-28

### 업로드 크기 검증 + 본문 렌더 (PR #56~#57)

- `MAX_FILE_SIZE`가 `50 * 10240 * 10240`(≈5.2GB) **오타**라 클라이언트 크기 검증이 사실상 무력화 → 20MB 초과 이미지가 Cloudflare Images 하드 리밋(20MB, error 5413)에 걸려 업로드 실패했다. 20MB로 정정 (#56).
- Journal 본문 이미지의 `aspect-video`/`object-cover` 강제 크롭 제거(세로 사진·다이어그램이 잘리던 버그), iframe/표/코드블록 넘침 방어 클래스 추가 (#57).

---

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
