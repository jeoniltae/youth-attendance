# 연도별 시트 운영 및 과거 데이터 조회 확장 방안

이 문서는 **1년 단위로 스프레드시트를 새로 만들어 운영**하는 방식과,
나중에 **과거 연도 데이터를 조회하는 기능**을 붙일 때의 방향을 미리 정리한 것이다.
당장 구현하는 것은 아니며, 매년 운영 시 지켜야 할 최소 규칙과 향후 확장 설계를 남긴다.

---

## 1. 왜 1년 단위 시트인가

- **삭제 시 출석 기록 정리(cascade delete)와 잘 맞음**: 학생/교사를 삭제하면 해당 인원의
  Attendance 기록도 함께 삭제된다(`src/app/api/students/[id]/route.ts`,
  `src/app/api/teachers/[id]/route.ts`). 시트를 연도별로 분리하면 이 삭제가 **현재 연도 시트
  안에서만** 일어나므로, 과거 연도 통계는 영향받지 않는다.
- **ID 재사용 오염 차단**: 학생/교사 ID에 연도가 들어가므로(`2026-1-2-001`, `T-2026-006`)
  해가 바뀌면 자연히 새 순번 공간이 열린다. 같은 해 안의 삭제→재등록 시 순번 재사용은
  cascade delete로 이미 해결되어 있다.
- **성능/용량**: Attendance는 매주 수백 행씩 쌓인다. 1년치로 끊으면 한 시트의 크기가
  관리 가능한 수준으로 유지되어 읽기 속도가 안정적이다.

---

## 2. 매년 새 시트를 만들 때 지켜야 할 규칙 (중요)

새 앱은 시트를 **탭 이름**과 **헤더 이름/순서**로 읽고 쓴다. 따라서 새 시트도 구조가
기존과 완전히 동일해야 기존 코드가 그대로 동작한다.

- **탭 3개 유지**: `Students`, `Teachers`, `Attendance` (이름 정확히 일치)
- **헤더 구조 유지**: 각 시트 1행 헤더를 아래와 동일하게 (`docs/context-notes.md`,
  루트 `CLAUDE.md`의 DB 구조 참고)
  - Students: `ID, Session, Grade, Class, Name, Phone, ParentPhone, Address, Birthdate, School, Teacher, Notes, 출석률, 세례, gender`
  - Teachers: `ID, Session, Team, Name, Phone, Address, Birthdate, Notes`
  - Attendance: `Date, Session, Grade, Class, StudentID, Name, Status, Timestamp, ect, Type`
- **권장 생성 방법**: 올해 시트를 **사본 복제** 후 데이터 행만 비우면 구조가 자동으로 일치한다.
  - 명단(Students/Teachers)은 계속 다닐 인원을 이어가려면 유지, 새로 시작하려면 정리
  - Attendance는 새해 출석을 새로 쌓을 것이므로 데이터 행 비움 (헤더는 유지)
- **검증**: 새 시트를 `.env.local`의 `GOOGLE_SPREADSHEET_ID`에 넣고
  `node scripts/verify-sheets.mjs` 실행 → 헤더 이름/순서 일치 확인
- **서비스 계정 공유**: 새 시트에 `GOOGLE_SERVICE_ACCOUNT_EMAIL`을 **편집자**로 공유

> 새친구(`NewFamilies` 탭)를 별도로 운영한다면, 기존처럼 `scripts/migrate-newfamilies.mjs`로
> Students의 `Grade='새친구'`로 이전하는 절차를 새 시트에도 적용한다.

---

## 3. 연말·연초 전환 절차 (요약)

1. 새 연도 시트 생성 (위 2번 규칙대로, 사본 복제 방식)
2. 서비스 계정 편집자 공유
3. Vercel 환경변수 `GOOGLE_SPREADSHEET_ID`를 새 시트 ID로 교체 (배포 환경)
4. 로컬 검증이 필요하면 `.env.local`도 교체 후 `verify-sheets.mjs` 실행
5. 이전 연도 시트는 **삭제하지 말고 보관** — 과거 조회 기능의 데이터 원본이 된다

> 전환 직후에는 새 시트에 쌓인 데이터만큼만 통계가 잡힌다(예: "최근 1년" 통계가 짧아짐).
> 이는 정상 동작이며, 과거 조회 기능(4번)이 붙으면 이전 연도를 따로 볼 수 있다.

---

## 4. 과거 연도 조회 기능 확장 설계 (향후)

현재 구조가 이 확장에 유리한 핵심 이유: **시트 ID가 코드에 하드코딩되어 있지 않고
환경변수 하나(`GOOGLE_SPREADSHEET_ID`)로 주입**된다(`src/lib/sheets.ts`). 과거 조회는
"어느 시트를 읽을지 고르는 문제"로 귀결된다.

### 접근 A — 연도 파라미터 방식 (권장)

- **연도→시트 ID 매핑**을 환경변수로 관리
  - 예: `GOOGLE_SPREADSHEET_ID_2026`, `GOOGLE_SPREADSHEET_ID_2025`, …
  - 또는 JSON 형태 한 개(`GOOGLE_SPREADSHEET_IDS={"2026":"...","2025":"..."}`)
  - **실제 ID 값은 절대 커밋하지 않고 `.env.local`/Vercel 환경변수에만** 둔다
    (`docs/security-checklist.md` 준수)
- `src/lib/sheets.ts`의 `readSheet` 등에 **연도(또는 시트 ID) 인자**를 추가해
  선택된 시트를 읽도록 확장
- 조회 API(`/api/roster`, `/api/attendance`, `/api/birthdays`, `/api/stats`,
  `/api/stats/member`)가 `?year=2025`를 받아 해당 시트로 위임
- UI에 **연도 선택 UI 추가** — 현재 세션(오전/오후) 셀렉트와 동일한 패턴에 연도 하나만 얹음
- 데이터 마이그레이션 불필요: 과거 데이터는 이미 그 해 시트에 완결되어 있다

### 접근 B — 읽기 전용 아카이브 뷰 (더 안전/단순)

- 과거 연도는 수정할 일이 거의 없으므로, **조회 전용 화면**만 별도로 두고
  쓰기(출석 토글·CRUD)는 비활성화
- 실수로 과거 데이터를 건드릴 위험이 없고 구현이 단순함
- 관리자 화면(`/members`)의 수정 기능은 현재 연도에만 노출

### 작업 범위 요약

건드릴 곳은 크게 세 군데:
1. `src/lib/sheets.ts` — 연도별 시트 ID를 고르는 계층 추가
2. 조회 API 라우트들 — `year` 파라미터 수용 후 위임
3. UI — 연도 선택 컨트롤 추가 (세션 셀렉트 패턴 재사용)

쓰기 API(등록/수정/삭제/토글)는 **현재 연도에만** 허용하는 것을 기본 원칙으로 한다
(과거 시트는 읽기 전용).

---

## 5. 주의사항 / 결정 기록

- **cascade delete는 현재 활성 시트 안에서만 동작** — 과거 연도 시트는 별도 파일이라
  영향 없음. "과거 통계가 삭제로 바뀌는" 우려는 시트가 분리되어 있으면 발생하지 않는다.
- **ID 형식 유지**: 학생 `YYYY-학년-반-순번(3자리)`, 교사 `T-YYYY-순번(3자리)`.
  연도 prefix 덕분에 연도 간 ID 충돌은 원래 없다.
- **과거 시트 보관 필수**: 전환 시 이전 시트를 지우면 과거 조회 기능의 데이터가 사라진다.
- 이 문서는 설계 방향 메모이며, 실제 구현 시점에 `docs/context-notes.md`에 결정 사항을 남긴다.
