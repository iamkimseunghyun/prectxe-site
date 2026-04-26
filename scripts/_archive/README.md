# Archived one-off scripts

이 폴더의 스크립트들은 모두 **일회성 실행을 마친 마이그레이션 / 데이터 복구 / 관리자 작업** 기록입니다. 활성 사용은 하지 않으며, 히스토리 추적·재실행 참고용으로만 보관합니다.

## 분류

**Form 데이터 복구** (2025년 형식 변경 후속):
- `migrate-form-responses.ts`, `migrate-recovered-responses.ts`
- `recover-form-data.ts`, `recover-responses.ts`, `recover-three-submissions.ts`
- `check-form-data.sql`, `check-form-responses.ts`, `check-recovery-branch.ts`, `check-three-in-recovery.ts`

**관리자 / 사용자 관리** (1회성):
- `create-habo-admin.ts`, `update-habo-password-prod.ts`
- `update-test-password.ts`, `update-user-role.ts`
- `list-users.ts`

## 재실행 시 주의

각 스크립트는 작성 시점의 schema·env 기준이므로, **그대로 실행하면 깨질 수 있습니다**. 비슷한 작업이 다시 필요할 경우:

1. 스크립트 로직만 참고
2. 현재 schema에 맞춰 다시 작성
3. 필요시 백업 브랜치 먼저 생성 (`mcp__Neon__create_branch`)

`scripts/` 루트에는 새 일회성 스크립트만 두고, 실행 후 _archive로 이동해주세요.
