# 🚨 Form 데이터 복구 가이드

## 현재 상황
- **Form**: Max Cooper Insight Session
- **문제**: 설명만 수정했는데 제출 데이터(submissions) 모두 삭제됨
- **원인**: `updateForm` 로직의 `FormField.deleteMany()` 버그

## 복구 방법

### 방법 1: Neon Branch로 시간 여행 복구 ⭐ 권장

Neon은 Point-in-Time Recovery 기능을 제공합니다.

```bash
# 1. Neon 대시보드 접속
https://console.neon.tech/

# 2. 프로젝트 선택 → Branches 탭

# 3. "Create branch" 클릭
# - Branch from: main (또는 현재 사용 중인 브랜치)
# - Type: Point in time
# - Timestamp: 데이터 삭제 이전 시점 선택 (예: 2026-01-20 18:00)
# - Branch name: recovery-max-cooper

# 4. 복구 브랜치의 Connection String 복사

# 5. 복구 브랜치에서 데이터 추출
```

### 방법 2: SQL로 복구 브랜치 데이터 병합

```sql
-- 1. 복구 브랜치의 Connection String으로 연결
-- DATABASE_URL=postgresql://...recovery-max-cooper... bunx prisma studio

-- 2. 데이터 추출 (복구 브랜치에서)
-- FormSubmission과 FormResponse를 JSON으로 추출

-- 3. 메인 DB에 INSERT
-- 복구한 데이터를 현재 DB에 병합
```

### 방법 3: TypeScript 스크립트로 자동 복구

아래 스크립트 실행:

```bash
# 환경변수 설정
export RECOVERY_DATABASE_URL="postgresql://...recovery-branch..."
export MAIN_DATABASE_URL="postgresql://...main..."

# 복구 스크립트 실행
bun run scripts/recover-form-data.ts
```

## 즉시 할 일

### 1단계: Neon에서 복구 브랜치 생성

1. https://console.neon.tech/ 접속
2. 프로젝트 선택
3. Branches → Create branch
4. **Point in time** 선택
5. **어제(1/20) 저녁 시간** 선택 (데이터 삭제 이전)
6. Branch 이름: `recovery-max-cooper`
7. Connection String 복사

### 2단계: 복구 브랜치 Connection String 확인

복구 브랜치의 Connection String을 메모:
```
postgresql://...@ep-...-pooler.ap-southeast-1.aws.neon.tech/neondb?branch=recovery-max-cooper
```

### 3단계: 복구 스크립트 실행

제가 복구 스크립트를 작성해드리겠습니다.

## 예방 방법

### 버그 수정 완료 후

1. ✅ `updateForm` 로직 수정 (FormField를 삭제하지 않고 업데이트)
2. ✅ Form 수정 시 데이터 보존 보장
3. ✅ 자동 백업 설정 (Neon Branch 자동 생성)

## 참고: Neon PITR 정보

- **무료 플랜**: 7일 history
- **Pro 플랜**: 30일 history
- **복구 가능**: 최근 7일 이내 모든 시점

즉시 복구하지 않으면 7일 후 영구 삭제됩니다!
