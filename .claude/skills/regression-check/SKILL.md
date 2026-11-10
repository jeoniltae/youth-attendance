---
name: regression-check
description: 피처 개발이 끝난 뒤 기존 핵심 기능(출석 토글·인증 게이트·학생/교사 수정·집계·말씀노트 토큰 API)에 영향이 없는지 운영 실시트를 건드리지 않고 검사한다. "영향도 체크", "회귀 검사", "기존 기능 깨졌는지", "안정성 검사", "regression check" 요청이나 feature-workflow VERIFY 단계에서 사용한다.
---

# 기존 기능 영향도 검사 (고등부 전자출석부)

<!-- public 저장소다. 이 파일과 보고서에 비밀값·실제 학생/교사 정보·토큰·QR URL을 적지 않는다. -->

## 0. 안전 규칙 — 운영 실시트를 절대 건드리지 않는다

이 검사는 **시트에 접속할 수 없는 환경에서만** 실행한다.

| 허용 | 이유 |
|---|---|
| `npm run test:e2e` | 포트 3200 서버가 구글 환경변수를 무효값으로 덮고, 브라우저 요청은 `tests/e2e/mock.ts`의 `page.route`가 가짜로 응답 |
| `npx tsc --noEmit`, `npm run build` | 시트 접속 없음 |
| `node scripts/verify-notes-lib.mjs` | 순수 함수 검사, 시트 접근 없음 |
| 새로 쓰는 순수 함수 검사 (`node`로 `src/lib/*.ts` import) | `src/lib/sheets.ts`를 import하지 않는 한 안전 |

| 금지 | 이유 |
|---|---|
| `npm run dev`(포트 3000)나 `.env.local`로 띄운 서버에 브라우저·`curl` 접속 | 출석 토글·삭제가 **운영 시트에 그대로 기록**된다 |
| `scripts/` 중 `verify-notes-lib.mjs`를 뺀 나머지 전부 | `.env.local`로 실시트에 접속하거나 시트를 고친다 |
| `src/lib/sheets.ts`를 import하는 검사 코드 | 실시트 클라이언트가 만들어진다 |

- 실시트 확인이 꼭 필요하다고 판단되면 **실행하지 말고** 보고서의 "사람이 할 확인"에 적는다.
- `test:e2e`는 평소 dev 서버가 떠 있으면 충돌하므로, 사용자에게 dev 서버를 꺼 달라고 먼저 말한다.
- 커밋·푸시는 하지 않는다(사용자가 직접 한다).

## 1. 변경 범위 파악

```bash
git diff --name-only main...HEAD
git status --short
```

두 결과를 합친 파일 목록으로 2·3단계의 검사 영역을 고른다.

## 2. 기본선 (항상 실행)

순서대로 실행하고, 실패하면 그 자리에서 멈추고 출력을 보고한다.

1. `npx tsc --noEmit`
2. `npm run test:e2e`
3. `node scripts/verify-notes-lib.mjs`
4. `npm run build`

린트 스크립트는 없다. 없는 명령을 만들어 실행하지 않는다.

## 3. 핵심 영역 검사 (변경 파일에 해당하는 영역만)

각 영역은 **"무엇으로 확인했는지"** 를 남긴다. 수단이 없으면 지어내지 말고 `미검사`로 적는다.

### A. 출석 토글
- 대상 파일: `src/hooks/useAttendance.ts`, `src/api/attendance.ts`, `src/app/api/attendance/**`, `MemberCard.tsx`, `src/app/page.tsx`, `StudentForm.tsx`·`TeacherForm.tsx`의 출석 수정
- 확인할 것
  - 누르면 즉시 반영되고, 저장 실패 시 원래 상태로 롤백된다
  - 30초 polling이 방금 누른 결과를 이전 값으로 덮어쓰지 않는다
  - 출석 = 행 추가, 취소 = 그 학생·그 날짜 행만 삭제 (다른 행 영향 없음)
- 수단: E2E(`page.route`로 POST 실패를 흉내) + 코드 확인

### B. 인증 게이트 (session / registry / admin)
- 대상 파일: `useAuthGate.ts`, `AuthGateModal.tsx`, `PublicGate.tsx`, `src/app/api/auth/**`, 게이트 화면(`/`, `/history`, `/birthday`, `/guide`, `/registry`, `/members`, `/teachers`, `/notes/summary`), 이 화면들이 쓰는 데이터 훅·queryKey
- 확인할 것
  - 세 게이트가 서로 독립 (admin 통과가 registry를 열지 않음)
  - **다른 화면에서 데이터를 받은 뒤 이동해도** 게이트 뒤에 실데이터가 그려지지 않는다 (`enabled`만이 아니라 렌더도 막는지)
  - 새 화면이 있으면 올바른 게이트 뒤에 있다
- 수단: `tests/e2e/gates.spec.ts` (새 게이트 화면이면 같은 패턴으로 케이스 추가)

### C. 학생·교사 수정/삭제 (데이터 보존)
- 대상 파일: `StudentForm.tsx`, `TeacherForm.tsx`, `useStudents.ts`, `useTeachers.ts`, `src/app/api/students/**`, `src/app/api/teachers/**`, `src/types/index.ts`, `src/lib/sheets.ts`
- 확인할 것
  - 저장이 행 전체를 덮어쓰므로, 폼에 없는 컬럼과 목록 밖 값(세례 `(기존 값)` option 등)이 보존된다
  - 학생 삭제는 SermonNotes 기록 해제(`retireRowsWhere`) → 학생 행 삭제 순서
  - 타입·컬럼 순서가 바뀌었으면 읽기·쓰기 매핑이 시트 헤더 순서(CLAUDE.md 표)와 맞다
- 수단: 코드 확인 (서버 쓰기는 E2E로 검사되지 않는다 — 결과에 명시)

### D. 집계 숫자
- 대상 파일: `src/lib/attendance-range.ts`, `src/lib/date.ts`, `src/app/api/stats/**`, `src/app/api/notes/summary/**`, `src/components/history/**`, `RegistryTable.tsx`
- 확인할 것
  - 같은 날 중복 행이 있어도 하루 1회만 센다 (날짜 Set)
  - 분모: 1년 출석률 = 실제 예배일 수 / 반기·말씀노트 = 기간의 일요일 수(고정)
  - 기간 모드: 개근 + 부분 출석 + 결석 = 명단 인원
- 수단: 순수 함수는 `node`로 직접 import해 assert (`scripts/verify-notes-lib.mjs` 패턴, 결과 파일은 스크래치 폴더). Route Handler 안의 계산은 코드 확인

### E. 말씀노트 토큰 API
- 대상 파일: `src/app/api/notes/class/**`, `src/lib/notes-token.ts`, `src/lib/notes-period.ts`, `ClassNotesScreen.tsx`, `useClassNotes.ts`, `src/lib/analytics.ts`
- 확인할 것
  - 다른 반 학생 저장 403 / 잘못된 토큰 404 / 체크 가능 날짜 밖 400
  - 응답에 id·이름 외 개인정보가 없다
  - `SiteAnalytics`가 토큰 주소를 계속 가린다
- 수단: `verify-notes-lib.mjs`(토큰·날짜 함수) + `tests/e2e/notes.spec.ts`(화면) + Route Handler 코드 확인

### F. 보안 기본선 (항상)
- `git diff main...HEAD`와 작업 트리 변경에 다음이 없는지 확인 (`docs/security-checklist.md` 기준)
  - `.env*`, `docs/legacy-gas.json`
  - 실제 이름·전화번호·주소·생년월일, 스프레드시트 ID, 토큰·QR URL
- 테스트·예시 데이터는 더미 값(`홍길동`, `010-0000-0000`)만

## 4. 보고 형식

```
## 영향도 검사 결과 (기준: main...HEAD)

### 기본선
- tsc: 통과 / 실패(출력 요약)
- test:e2e: n개 통과 / 실패 케이스명
- verify-notes-lib: 통과 / 실패
- build: 통과 / 실패

### 핵심 영역
| 영역 | 해당 여부 | 결과 | 확인 수단 |
|---|---|---|---|
| A 출석 토글 | 해당/무관 | 통과/문제/미검사 | E2E notes.spec … / 코드 확인 |
| … | | | |

### 발견한 문제
- 파일:줄 — 무엇이 어떻게 깨지는지

### 사람이 할 확인
- 실시트·실기기로만 확인 가능한 것 (예배 시간을 피해서)
```

- 실행하지 않은 검사를 `통과`로 적지 않는다. 코드만 읽었으면 `코드 확인`이라고 수단을 밝힌다.
- 출력에 실제 이름·토큰·비밀번호를 남기지 않는다.
