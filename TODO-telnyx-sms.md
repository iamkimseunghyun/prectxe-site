# SMS 시스템 구축 TODO (솔라피)

## ✅ 완료된 작업
- [x] 솔라피 SDK 설치 (`solapi@5.5.4`)
- [x] SMS 유틸리티 함수 작성 (`src/lib/sms/solapi.ts`)
- [x] Prisma 스키마에 SMS 모델 추가 (SMSCampaign, SMSRecipient)

## 🔧 필수 설정 작업

### 1. 솔라피 회원가입 및 API 키 발급
1. 솔라피 회원가입: https://solapi.com/
2. 로그인 후 [API 키 관리](https://solapi.com/console/apiKeys)로 이동
3. API Key와 API Secret 발급
4. 최소 충전금액 1만원 충전

### 2. 발신번호 등록
1. 솔라피 콘솔 > [발신번호 관리](https://solapi.com/console/sendingNumbers)
2. 발신번호 등록 (본인 인증 필요)
3. 승인 대기 (1~2일 소요)

### 3. 환경변수 설정
`.env` 파일에 추가:
```env
# Solapi SMS
SOLAPI_API_KEY=your_api_key_here
SOLAPI_API_SECRET=your_api_secret_here
SOLAPI_SENDER_PHONE=01012345678  # 등록한 발신번호 (하이픈 제거)
```

### 4. 데이터베이스 마이그레이션 ⚠️
**현재 상태**: drift 감지됨 (실제 DB와 마이그레이션 파일 불일치)

```bash
# 옵션 1: 개발 환경 (데이터 삭제됨) - 권장
bunx prisma migrate reset
bunx prisma migrate dev -n "add-sms-campaign-models"

# 옵션 2: 빠른 개발 (마이그레이션 파일 없이)
bunx prisma db push

# 실행 전 기존 데이터 백업 권장!
```

## 📋 다음 작업

### 5. Server Actions 작성
파일: `src/modules/sms/server/actions.ts`
- [ ] Form 응답자 전화번호 추출
- [ ] SMS 캠페인 생성
- [ ] 단체 SMS 발송
- [ ] 발송 이력 조회

### 6. Admin SMS 페이지 생성
- [ ] AdminNav에 SMS 탭 추가 (MessageSquare 아이콘)
- [ ] `/admin/sms` 메인 페이지
- [ ] Form 선택 UI (Form 응답자 발송 모드)
- [ ] 독립 발송 UI (CSV/엑셀/수동 입력)
- [ ] 발송 이력 목록

### 7. UI 컴포넌트
- [ ] SMS 캠페인 생성 폼
- [ ] 전화번호 입력/업로드 컴포넌트
- [ ] 발송 진행 상태 표시
- [ ] 발송 결과 토스트

### 8. 테스트
- [ ] 단일 번호 발송 테스트
- [ ] 단체 발송 테스트
- [ ] Form 응답자 발송 테스트
- [ ] 오류 처리 확인
- [ ] 전화번호 검증 테스트

## 💰 가격 정보
- SMS (단문 90byte): 13원/건
- LMS (장문 2000byte): 29원/건
- 기본료: 없음
- 실패건: 자동 환불

## 📚 참고 문서
- 솔라피 공식 문서: https://developers.solapi.dev/
- 솔라피 Node.js SDK: https://github.com/solapi/solapi-nodejs
- 가격 정책: https://solapi.com/pricing/
