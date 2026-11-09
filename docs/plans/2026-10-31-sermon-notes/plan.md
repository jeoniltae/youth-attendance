# 구현 계획: 말씀노트 기록 관리 (sermon-notes)

- spec: ./spec.md
- 상태: 검증 완료 (계획 확정 2026-10-31, spec 승인 후 보정 2026-11-06, 후속 변경 8단계 추가 2026-11-08)

## 개요
학생들이 말씀노트를 썼는지(내용 길이 무관) 날짜별로 기록하고, 4개월 단위로 12회 이상 작성자를 총무팀이 바로 확인해 시상할 수 있게 한다.
반별 보관함 칸에 붙인 QR을 찍으면 그 반 명단 체크 화면이 비밀번호 없이 열리고(반별 비밀 토큰 링크), 종합 화면은 admin 게이트 뒤에서 작성 횟수순으로 보여 준다.
학생 정보(세션·학년·반·이름·전화번호)는 기존 출석부 시트(Students)에서 가져온다.

## 확정 사항
| 항목 | 결정 |
|------|------|
| 데이터 저장 | 기존 출석부 스프레드시트에 `SermonNotes` 탭 추가 |
| QR | 반마다 1개, 반별 보관함 칸에 부착 |
| 체크 화면 인증 | 비밀번호 없음 — **반별 비밀 토큰 링크** (`/notes/c/[token]`) |
| 종합 화면 인증 | admin 게이트 |
| 기간 | 1기 1~4월 / 2기 5~8월 / 3기 9~12월 (연도 안 고정) |
| 대상 | 학생만 — 교사·새친구(학년 `새친구`, 반 없음) 제외 |

## 설계 결정
- **토큰 = `HMAC-SHA256(NOTES_QR_SECRET, "오전-1-2")` 앞 16자(base64url)**
  - 저장소가 public이라 `?session=&grade=&class=` 주소는 숫자만 바꿔 다른 반 명단 열람·기록 조작이 가능 → 추측 불가능한 토큰으로 대체
  - 비밀값은 `.env.local`·Vercel에만 → 토큰 목록을 어디에도 저장할 필요 없음. 서버는 존재하는 반 목록(Students의 세션·학년·반 조합)에 대해 HMAC을 계산해 일치하는 반을 찾는다
  - 유출 시: 비밀값 교체 후 QR 전체 재인쇄
  - 비교는 `crypto.timingSafeEqual`
- **토큰 API는 서버가 범위를 강제한다** — 토큰 → 반을 서버가 결정, 그 반 학생의 `id`·`name`만 반환. POST도 대상 학생이 토큰의 반 소속인지, 날짜가 형식에 맞는 올해 일요일이고 미래가 아닌지 확인 후 저장 (화면 제한만으로는 토큰 보유자의 평일 행을 막지 못해 횟수가 분모를 넘을 수 있다). 기존 `/api/roster`(전화·주소 포함)는 이 화면에서 호출하지 않는다
- **SermonNotes 구조는 Attendance를 따른다** — `Date, Session, Grade, Class, StudentID, Name, Timestamp`. 행이 있으면 작성, 없으면 미작성. POST는 `/api/attendance`의 멱등 패턴(status 지정 시 이미 그 상태면 no-op) — 순차 재요청은 중복이 안 생긴다. 다만 조회 후 추가라 원자적이지 않아 **거의 같은 순간의 저장은 중복 행이 생길 수 있다** → 집계는 날짜 Set으로 1회만 세고, 해제는 그 학생·그날 행을 모두 `retireRowsWhere`로 `해제` 처리한다 (한 행만 지우면 체크가 되살아남. 행을 실제로 지우면 동시 해제 때 번호가 밀려 남의 기록이 지워져 2026-11-07 리뷰에서 변경)
- **학생 삭제 시 SermonNotes도 함께 삭제(cascade)** — Attendance와 같은 이유(같은 해 안 ID 재사용 시 남의 기록이 붙는 오염 방지). 기존 `deleteRowsWhere`를 학생 DELETE 라우트에 한 줄 추가
- **연도별 시트 운영과 맞춘다** — 기간이 연도 안에서 끝나므로 집계가 시트를 넘지 않는다. 앱은 현재 시트만 읽으므로 기간 드롭다운은 올해 3개 기간만 보여 주고, 3기 명단은 시트 전환 전에 복사해 둔다(2026-11-06 사용자 결정). `docs/yearly-sheet-operation.md`의 탭 목록·헤더와 `scripts/verify-sheets.mjs` 검증 대상에 `SermonNotes` 추가
- **기본 날짜 = 가장 최근 일요일(KST)**, 일요일만 선택 가능, 올해 안의 과거 날짜 가능 (미래·지난해 불가). 새해 첫 일요일 전이면 체크할 날짜가 없다는 안내를 보여 준다
- **분모 = 그 기간 전체 일요일 수(고정)** (`countSundays()` — 지금 `stats/rates` 라우트 안 비공개 함수라 `lib/date.ts`로 옮겨 공유). 진행 중 기간도 같다 — 교적부 반기 컬럼과 같은 규칙(2026-11-06 사용자 결정)
- 체크 화면은 세로 명단(시안 A2), PC는 가운데 정렬 + 최대 폭 560px만 (반응형 분기 없음). `noindex` 메타는 서버 컴포넌트인 `page.tsx`에서 내보내고 화면 본체는 클라이언트 컴포넌트로 나눈다
- 종합 화면은 카드 행 목록 + "시상 기준 12회" 구분선(시안 B2). 순서는 횟수 내림차순 고정이라 TanStack Table·컬럼 정렬을 쓰지 않는다
- **화면 UI는 아티팩트 시안을 먼저 보고 결정한다** — 아래 "화면" 절의 구성은 기능 범위이고, 배치·스타일은 2.5단계에서 확정한 시안을 따른다
- **확정 시안 (2026-11-06 사용자 결정)** — [말씀노트 시안](https://claude.ai/artifact/4qbVd2yn9s9ovXLHA7zfSm)의 **A2 세로 명단 + B2 시상 기준선**
  - 화면 A: `SummaryBar` 대신 상단 고정 영역(반 표시·진행 막대·날짜 칩)을 쓴다. 시안의 칩은 5개지만 "올해 안의 과거 일요일 전부 선택 가능"을 지키기 위해 올해 지난 일요일 전체를 가로 스크롤 칩으로 둔다
  - 화면 B: `12회 이상만` 토글을 없애고 목록 중간의 기준선으로 대신한다. 복사 버튼은 `시상 명단 복사`로, 세션 탭 안의 12회 이상 학생만 복사한다. 12회 도달자가 없으면 복사 버튼을 끈다

## 검증 도구 분담
검증은 세 가지 방법으로 나눈다. 각 체크포인트 항목 끝의 `[스크립트]`·`[agent-browser]`·`[Playwright]`·`[사람]` 표시가 이 분담을 따른다.

| 도구 | 맡는 것 | 이유 |
|------|---------|------|
| node 스크립트 (`scripts/verify-*.mjs` 방식) | 토큰·404/403·멱등·응답 필드·cascade 등 **API 수준** 검사 | 응답만 보면 되는 검사라 브라우저가 필요 없고, 이쪽이 빠르고 정확하다 |
| **agent-browser** (주력) | 375px·1024px 화면 확인, 동시 체크, 필터·복사 결과 대조, 기존 화면 회귀 둘러보기, 사용 안내 캡처 | "어색하지 않은지"처럼 코드로 판정할 수 없는 확인과 한 번만 하면 되는 탐색형 점검. 캡처는 `guide/capture/capture.mjs`가 이미 agent-browser로 동작한다 |
| **Playwright** (최소 범위) | ① 다른 화면을 거쳐 들어와도 게이트 뒤 렌더 차단 ② POST 실패 시 롤백 ③ 잘못된 토큰 안내 화면 — **이 3개만** | 코드를 고칠 때마다 조용히 깨질 수 있는 지점이다. ①은 CLAUDE.md에 경고로 남은, 이미 한 번 겪은 함정이고 깨지면 개인정보가 노출된다. ②는 `page.route`로 실패를 일부러 만들어야 해서 스크립트형 테스트가 맞다 |
| 사람 | 시안 선택, 실제 QR 휴대폰 촬영 | 판단과 실제 기기가 필요하다 |

### 주의할 점
- **Playwright 테스트는 실시트를 절대 건드리지 않는다.** `/api/*`는 모두 `page.route`로 가짜 응답을 준다. 가짜 명단은 `guide/mock/data.json`의 더미 데이터를 재사용한다. 테스트 서버는 사용 안내 촬영 서버와 같은 방식으로 띄운다. 구글 환경변수 3개를 무효값으로 덮고 별도 포트로 띄우면, 가로채지 못한 요청은 실시트에 닿는 대신 오류로 실패한다
- **테스트 코드·픽스처에도 실명·실제 연락처·실제 토큰을 쓰지 않는다** (public 저장소). 토큰은 테스트용 비밀값으로 만든 값만 쓴다
- **agent-browser로 하는 체크포인트 C 확인은 실시트에 기록이 남는다.** 의미 없는 과거 일요일 날짜를 골라 확인하고, 끝나면 체크를 해제해 행을 지운다. 확인 후 SermonNotes 탭에 테스트 행이 남지 않았는지 본다
- **같은 항목을 두 도구로 이중 검사하지 않는다.** Playwright가 맡은 3개는 agent-browser 점검 목록에서 뺀다. 두 도구는 같은 Playwright 엔진 위에서 돌아 서로 충돌하지 않지만, 중복 검사는 유지비만 늘린다
- **브라우저는 미리 받아 두었다 (2026-10-31).** `npx playwright install chromium`으로 `%LOCALAPPDATA%\ms-playwright`에 `chromium-1248`·`chromium_headless_shell-1248`이 설치되어 있다. 이 폴더는 PC 전체가 공유하는 Playwright 전용 브라우저라 프로젝트 파일은 바뀌지 않았다. 작업 11-1에서 설치한 1.65.0에 맞춰 `chromium-1254`를 추가로 받았다(2026-11-06). 테스트 도구 `@playwright/test`는 작업 11-1에서 설치한다. 그 사이 Playwright 새 버전이 나와 브라우저 빌드 번호가 달라지면, 설치 후 `npx playwright install chromium`을 한 번 더 실행한다. 설정은 기본값(전용 Chromium)을 쓰고 `channel: "msedge"`·`"chrome"`은 쓰지 않는다 — 자동 업데이트되는 브라우저와 버전이 어긋나지 않게 하고, CI로 옮길 때도 설정을 바꾸지 않기 위해서다
- **Playwright는 새 의존성이다.** `@playwright/test`(devDependency)·`playwright.config.ts`·브라우저 다운로드가 추가되므로 "영향 범위" 표와 16-1 변경 범위 대조에 포함한다. 테스트 결과물(`test-results/`·`playwright-report/`)은 `.gitignore`에 추가한다. 실패 시 저장되는 스크린샷에도 가짜 데이터만 찍히는지 확인한다

## 화면
### A. 기록 체크 `/notes/c/[token]` (인증 없음)
- 상단 고정: 반 표시(`오전 · 1학년 2반`), 진행 요약 `12명 중 7명 체크` + 진행 막대, 날짜 칩(가로 스크롤)
- 카드 전체 탭으로 토글(44px↑), Optimistic Update + 실패 시 롤백, 30초 polling
- 그날 결석한 학생은 카드를 흐리게 + `결석` 표시 (체크는 가능)
- 잘못된 토큰 → 안내 화면(404)

### B. 종합 `/notes/summary` (admin 게이트)
- 진입: `/members` 헤더 `말씀노트` 버튼 (`교사 현황` 버튼과 같은 스타일)
- 상단: 기간 드롭다운(`2026년 3기 (9~12월)`), 점수판(시상 대상·전체·일요일 수), 세션 탭(전체/오전/오후), `시상 명단 복사` 버튼
- 행: 순위 · 이름 · 세션·학년·반 · 전화번호 · 횟수(12회 눈금이 있는 막대 + `12 / 17`)
- 순서 고정: 횟수 내림차순 → 학년 → 반 → 이름, 12회 이상과 미만 사이에 `시상 기준 12회` 구분선
- 시상 명단 복사: 세션 탭 안의 12회 이상 학생을 탭 구분 텍스트로 클립보드 (카톡·엑셀 붙여넣기)
- ⚠️ 게이트 통과 전 **렌더 자체를 막는다** (React Query 캐시 노출 주의 — CLAUDE.md)

## API
| 메서드 | 경로 | 인증 | 용도 |
|--------|------|------|------|
| GET | `/api/notes/class?token=&date=` | 토큰 | `{ session, grade, class, students: [{ id, name, written, present }] }` |
| POST | `/api/notes/class` `{ token, date, studentId, status }` | 토큰 | 멱등 저장, 같은 반 소속 검증 |
| GET | `/api/notes/summary?period=2026-3` | 없음(기존 API와 같은 수준) | 시트 1회 읽기로 기간 집계 + Students 정보 결합 + `sundays` 분모 |

## 디렉토리 구조
루트 `guide/`처럼 별도 폴더로 떼지 않는다. `guide/`는 배포되지 않는 촬영 도구라 밖에 있는 것이고, 말씀노트는 같은 시트 클라이언트·환경변수·인증 훅·색 토큰을 쓰는 **배포되는 앱 기능**이다.
기존 프로젝트의 "층(app·components·hooks·api·lib)별로 나누고 그 안에서 기능 이름으로 나누는" 방식(`components/registry`·`components/guide` 등)을 그대로 따르며, 모든 층에 `notes` 이름을 붙여 검색 한 번으로 모이게 한다. (`src/features/notes/` 같은 기능별 묶음은 이 프로젝트에서 혼자 규칙이 다른 섬이 되어 쓰지 않는다)

```
src/
├── app/
│   ├── notes/
│   │   ├── c/[token]/page.tsx        화면 A (QR 체크, 인증 없음)
│   │   └── summary/page.tsx          화면 B (종합, admin 게이트)
│   └── api/notes/
│       ├── class/route.ts            토큰 API (GET/POST)
│       └── summary/route.ts          기간 집계 (GET)
├── components/notes/                 ClassNotesScreen, NoteCheckCard, NotesSummaryList(+Skeleton)
├── hooks/                            useClassNotes.ts, useNotesSummary.ts
├── api/notes.ts                      클라이언트 fetch 함수
└── lib/                              notes-token.ts, notes-period.ts
scripts/                              add-sermon-notes-sheet.mjs, print-notes-qr-urls.mjs
tests/e2e/                            notes.spec.ts(롤백·잘못된 토큰), gates.spec.ts(게이트 렌더 차단), mock.ts(page.route 가짜 응답)
playwright.config.ts                  webServer = 무효 구글 환경변수 + 별도 포트
```

### 학생 정보를 가져오는 방식
- **Students 시트는 출석부 소유가 아니라 앱 전체의 공유 데이터**다. roster·birthdays·stats·students 라우트가 이미 각자 서버에서 `readSheet(SHEET.STUDENTS)`를 직접 읽는다 → 말씀노트 API도 같은 방식으로 직접 읽는다
- **출석부 API·훅(`/api/roster`, `useRoster`)을 거치지 않는다** — 전화·주소까지 내려주는 출석부 화면 전용이라 토큰 화면에 쓰면 보안 설계가 깨진다
- **의존 방향은 한쪽**: 말씀노트 → Students·Attendance 시트(읽기 전용). 출석부 코드는 말씀노트를 모른다
- `toStudent` 공용화(라우트 3곳에 중복)는 **이번 범위에서 제외** — 말씀노트는 이름·학년·반·전화번호만 필요해 엮지 않는다

## 영향 범위 (기존 코드)
말씀노트 때문에 손대는 기존 파일과 깨질 수 있는 지점. 6단계 회귀 점검의 기준 목록이다.

| 기존 파일 | 변경 | 깨질 수 있는 지점 |
|-----------|------|-------------------|
| `src/lib/sheets.ts` | `SHEET.SERMON_NOTES` 상수 + `readSheets`(batchGet) 추가, 행→객체 변환을 공유 함수로 분리 | 기존 `readSheet` 결과 불변이어야 함 — 모든 API가 거치는 함수 (`verify-read-api.mjs`로 확인) |
| `src/app/api/stats/rates/route.ts`, `src/lib/date.ts` | `countSundays()`를 `src/lib/date.ts`로 옮기고 import | 교적부 상/하반기 분모 값 불변이어야 함 (`/api/stats/rates` 응답 이동 전후 비교) |
| `src/app/api/students/[id]/route.ts` | DELETE에 SermonNotes cascade 삭제 한 줄 | ⚠️ **SermonNotes 탭이 없는 시트(새해 시트·탭 추가 전 배포)에서 학생 삭제가 500으로 실패**할 수 있음 → 배포 전 탭 생성 필수, `verify-sheets.mjs`로 확인. 출석 cascade는 그대로 동작해야 함 |
| `src/app/members/page.tsx` | `말씀노트` 진입 버튼, 모바일 버튼 줄바꿈 (공용 `Header.tsx`는 바꾸지 않음) | 헤더 줄 넘침(375·640·1024px) |
| `scripts/verify-sheets.mjs` | 검증 대상 탭에 SermonNotes 추가 | 기존 3개 탭 검증 결과 불변 |
| `.claude/feature-workflow.md` | 설정 `test:` 값을 `npm run test:e2e`로, VERIFY의 "테스트·린트 스크립트 없음" 문구를 함께 갱신 | 문서만 변경 |
| `guide/mock/intercept.js`·`shots.json`·`README.md` | `/api/notes/*` 가짜 응답·장면 추가 (`data.json`은 바꾸지 않음) | 기존 36장 촬영 장면이 그대로 다시 찍혀야 함 |
| `src/app/guide/page.tsx` | 절·대상별 카드 항목 추가 | 고정 내비·주소 앵커·접힘 상태 동작 |
| `.env.local.example` | `NOTES_QR_SECRET` 추가 | 이름만 추가, 값 없음 |
| `package.json`·`package-lock.json` | `@playwright/test` devDependency, `test:e2e` 스크립트 | 기존 `dev`·`build` 스크립트 불변. devDependency라 Vercel 배포 번들에는 영향 없어야 함 |
| `.gitignore` | `test-results/`·`playwright-report/` 추가 | 기존 제외 항목(`.env.local`·`docs/legacy-gas.json`·`guide/capture/raw/` 등) 유지 |
| `CLAUDE.md`·`docs/*` | 문서 갱신 | — |

## 작업 목록

### 1단계: 기반 (시트·토큰·기간 유틸)
- [x] 작업 1: `SermonNotes` 탭 헤더 추가 스크립트 `scripts/add-sermon-notes-sheet.mjs` (`add-teacher-lunar-header.mjs` 방식) + `src/lib/sheets.ts` `SHEET.SERMON_NOTES` 상수
- [x] 작업 2: 환경변수 `NOTES_QR_SECRET` — `.env.local`(값), `.env.local.example`·CLAUDE.md 환경변수 목록·`docs/security-checklist.md` Vercel 등록 목록(이름만)
- [x] 작업 3: `src/lib/notes-token.ts` — `makeClassToken(session, grade, class)` / `resolveClassToken(token, classes)` (HMAC + timingSafeEqual)
- [x] 작업 4: `src/lib/notes-period.ts` — 기간 키(`2026-3`) ↔ 날짜 구간, 오늘이 속한 기간, 올해 기간 목록, 최근 일요일 — `countSundays()`를 `stats/rates` 라우트에서 `lib/date.ts`로 옮겨 재사용
- [x] 작업 5: QR URL 출력 스크립트 `scripts/print-notes-qr-urls.mjs` — Students의 모든 반(새친구·반 빈칸 제외)에 대해 `반 → URL` 목록 출력 (출력은 커밋 금지)

### 체크포인트 A: 기반
- [x] 스크립트로 `SermonNotes` 탭 생성, `verify-sheets.mjs` 통과 `[스크립트]`
- [x] 같은 반 → 같은 토큰, 다른 반 → 다른 토큰, 변조 토큰 → null `[스크립트]`
- [x] 기간 경계(4/30·5/1·8/31·9/1·12/31) 변환 정확 `[스크립트]`

### 2단계: API
- [x] 작업 6: `GET/POST /api/notes/class` — 토큰 검증 → 반 명단(id·name, 새친구 제외) + 그날 작성/출석 여부, 멱등 저장 + 소속·날짜 검증, 해제는 `deleteRowsWhere`
- [x] 작업 7: `GET /api/notes/summary` — 기간 집계 (SermonNotes·Students 1회씩 읽기, 새친구 제외, 날짜 Set으로 인당 하루 1회)
- [x] 작업 8: 학생 DELETE 라우트에 SermonNotes cascade 삭제 추가 (`src/app/api/students/[id]/route.ts`)
- [x] 작업 9: 클라이언트 fetch 함수 `src/api/notes.ts` + 훅 `src/hooks/useClassNotes.ts`(polling·Optimistic) / `src/hooks/useNotesSummary.ts`

### 체크포인트 B: API
- [x] 잘못된 토큰 404, 다른 반 학생 POST 거부(403), 같은 요청 2회 → 행 1개 `[스크립트]`
- [x] 응답에 전화·주소 등 이름 외 개인정보 없음 `[스크립트]`
- [x] 평일·미래·지난해·잘못된 형식 날짜 POST 400 `[스크립트]`
- [x] 같은 날 중복 행을 만들어 두면 횟수 1회, 해제 시 모두 삭제 `[스크립트]`
- [x] 새친구가 명단·집계·QR URL 목록 어디에도 없음 `[스크립트]`
- [x] `print-notes-qr-urls.mjs`가 출력한 토큰으로 GET 200 (스크립트와 `notes-token.ts`의 HMAC 일치) `[스크립트]`
- [x] 학생 삭제 시 Attendance·SermonNotes 기록이 모두 지워지고, 다른 학생 기록은 남음 `[스크립트]`
- [x] `npx tsc --noEmit` 통과

### 2.5단계: UI 시안 (아티팩트로 먼저 보고 결정)
- [x] 작업 9-1: 화면 A(기록 체크) 시안을 아티팩트로 2~3안 제작 — 더미 데이터(`홍길동` 등)만 사용, 기존 색 토큰(paper/ink/stamp/teal/gold)·티켓 카드 스타일 기준, 모바일 375px 프레임 + PC 폭 미리보기
- [x] 작업 9-2: 화면 B(종합) 시안을 아티팩트로 2~3안 제작 — 기간 드롭다운·세션 탭·12회 필터·복사 버튼·횟수 막대 배치 비교
- [x] 작업 9-3: 사용자 검토 → 시안 선택·수정 반복 → 확정안을 이 문서 "설계 결정"에 기록 (선택 안·변경 사항·확정 아티팩트 링크)

### 체크포인트 B2: 디자인 확정
- [x] 화면 A·B 확정안 사용자 승인 — **승인 전에는 3·4단계 화면 구현을 시작하지 않는다**

### 3단계: 화면 A — 기록 체크 (확정 시안 반영)
- [x] 작업 10: `src/app/notes/c/[token]/page.tsx`(noindex) + `src/components/notes/ClassNotesScreen.tsx` — 반 표시·진행 막대·날짜 칩(최근 일요일 기본, 올해 지난 일요일만)·카드 토글·결석 흐림·잘못된 토큰 안내
- [x] 작업 11: 체크 카드 컴포넌트 `src/components/notes/NoteCheckCard.tsx` (시안 A2의 세로 카드 + 원형 체크, 56px)
- [x] 작업 11-1: Playwright 도입 — `@playwright/test` 설치(이 시점에 처음 설치, 미리 `dev`에 넣지 않음), `playwright.config.ts`(webServer는 무효 구글 환경변수 + 별도 포트), `tests/e2e/mock.ts`(`page.route` 가짜 응답, `guide/mock/data.json` 더미 재사용), `package.json` `test:e2e` 스크립트, `.gitignore`에 결과물 폴더 추가
- [x] 작업 11-2: `tests/e2e/notes.spec.ts` — POST 500 → 카드가 원래 상태로 롤백 / 잘못된 토큰 → 안내 화면
- [x] 작업 11-3: `src/lib/sheets.ts`에 `readSheets(이름 목록)` 추가(`values.batchGet`) → `GET /api/notes/class`가 탭 3개를 요청 1번으로 읽게 변경. 30초 polling이라 휴대폰 1대당 분당 읽기가 6회에서 2회로 준다 (2026-11-06 사용자 결정)

### 체크포인트 C: 화면 A
- [x] 휴대폰(375px)에서 체크/해제 → 시트 행 추가·삭제 확인 `[agent-browser]` — 의미 없는 과거 일요일로 확인 후 해제, 테스트 행 잔존 여부 확인 (Playwright 스크립트로 확인 — 이름·토큰 미출력)
- [x] 실패 시 롤백, 잘못된 토큰 안내 화면 `[Playwright]`
- [x] 두 브라우저 동시 체크 → 다음 polling 안에 상호 반영 `[agent-browser]` (세션 2개, 30초 + 저장·조회 시간 / Playwright 스크립트로 확인: 체크 30초, 해제 34초)
- [x] PC 폭에서 크게 어색하지 않음 `[agent-browser]`

### 4단계: 화면 B — 종합 (확정 시안 반영)
- [x] 작업 12: `src/components/notes/NotesSummaryList.tsx` (+ 스켈레톤) — 시안 B2의 기간 드롭다운·점수판·세션 탭·카드 행·12회 구분선·횟수 막대·시상 명단 복사
- [x] 작업 13: `src/app/notes/summary/page.tsx` — admin 게이트(`useAuthGate('admin')` + `AuthGateModal`), 통과 전 렌더 차단
- [x] 작업 14: `/members` 헤더에 `말씀노트` 진입 버튼
- [x] 작업 14-1: `tests/e2e/gates.spec.ts` — 다른 화면을 거쳐 이동한 경로로 `/notes/summary` 진입 시 게이트 통과 전 표가 렌더되지 않음 (같은 패턴으로 `/registry`·`/teachers`도 포함)

### 체크포인트 D: 화면 B
- [x] 다른 화면(/members 등)을 거쳐 들어와도 게이트 뒤에 데이터가 안 보임 `[Playwright]`
- [x] 기간 전환·세션 탭·구분선 위치·순서·복사 결과가 시트와 일치 `[agent-browser]` (실제 기록 0행이라 화면은 더미 데이터로, 인원·분모·순서는 실시트로 확인. Playwright 스크립트)
- [x] `npm run build` 통과

### 5단계: 사용 안내
- [x] 작업 15: `guide/mock/intercept.js`·`data.json`에 `/api/notes/*` 가짜 응답 추가, `shots.json`에 장면 추가 후 촬영·합성 → `public/guide/`
- [x] 작업 16: `/guide`에 "말씀노트 체크" 절(QR 찍기 → 날짜 확인 → 학생 누르기) + 총무팀용 카드에 "말씀노트 시상 명단 보기" 항목

### 6단계: 기존 기능 회귀 점검 (위 "영향 범위" 표 기준)
- [x] 작업 16-1: 변경 범위 확인 — `git diff --stat main...HEAD`로 손댄 기존 파일이 "영향 범위" 표에 있는 것뿐인지 대조. 표에 없는 기존 파일이 바뀌었으면 이유를 확인하고 표에 추가
- [x] 작업 16-2: 정적 점검 — `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` 통과 (lint 스크립트는 없음). 빌드 출력에서 기존 7개 화면 라우트가 모두 그대로 생성되는지 확인
- [x] 작업 16-3: 데이터 점검 — `node scripts/verify-sheets.mjs`(탭 4개·헤더), `verify-read-api.mjs`·`verify-write-api.mjs`로 기존 API 응답 형태 불변 확인 (`verify-read-api.mjs`의 attendance 2건 불일치는 기존 현상 — API가 커밋 255f4ce부터 세션 필터를 쓰지 않는데 스크립트는 세션별로 센다. 스크립트 연속 실행은 분당 읽기 한도 429를 부르므로 1분 띄운다)
- [x] 작업 16-4: 기존 화면 점검 `[agent-browser]` (dev 서버, 375px·1024px) — 게이트 렌더 차단은 16-2의 Playwright가 맡으므로 여기서는 진입·통과 동작만 본다
  - `/` 출석 토글·30초 polling·헤더 한 줄 유지
  - `/members` 학생 추가·수정·**삭제**(출석 cascade 정상) · 교사 현황 진입 · 새 `말씀노트` 버튼 배치
  - `/history`·`/birthday`·`/registry`·`/teachers`·`/guide` 진입과 게이트 동작 (세 게이트 독립 유지, 말씀노트 admin 통과가 다른 게이트에 영향 없음)
- [x] 작업 16-5: 사용 안내 캡처 회귀 `[agent-browser]` — 촬영 스크립트로 기존 장면 전체 재촬영 → `public/guide/` 기존 이미지와 비교해 의도하지 않은 변화 없음
- [x] 작업 16-6: 결과를 이 문서 하단 "회귀 점검 결과"에 기록 (통과 항목·발견 문제·조치)

### 체크포인트 E0: 회귀
- [x] 16-1~16-6 모두 통과, 발견 문제는 수정 또는 사유와 함께 보류 기록

### 7단계: 문서·마무리
- [x] 작업 17: CLAUDE.md 갱신 — 화면 표·SermonNotes 시트 구조·API·폴더 구조·환경변수·인증 구조(토큰 링크 설명)
- [x] 작업 18: `docs/yearly-sheet-operation.md`(탭 4개·헤더, 전환 절차에 3기 명단 복사 단계 추가), `docs/migration-progress.md` 항목, `docs/context-notes.md`(토큰 방식·cascade·고정 기간을 고른 이유)
- [x] 작업 18-1: `.claude/feature-workflow.md` 갱신 — 설정 `test: npm run test:e2e`로 변경(`test: auto`는 `test` 스크립트만 찾아 `test:e2e`를 놓친다), VERIFY 검증 명령에 추가, "테스트 러너 없음" 문구 정리
- [x] 작업 19: `docs/security-checklist.md` 기준 점검 — 비밀값·실제 토큰·QR URL·실명 미커밋 (`tests/e2e/` 픽스처·`test-results/` 미커밋 포함)

### 체크포인트 E: 완료
- [ ] 실제 반 QR 1장으로 휴대폰 촬영 → 체크 → 종합 화면 반영까지 end-to-end `[사람]`
- [ ] 배포 순서 확인: 실시트에 `SermonNotes` 탭 생성 → Vercel 환경변수 `NOTES_QR_SECRET` 등록 → 배포 (탭 없이 배포하면 학생 삭제가 실패함)

### 8단계: 후속 변경 — 체크 날짜를 기수 단위로 (2026-11-08 추가)
- **이전 완료:** 1~7단계는 2026-11-07 SHIP 판정 GO로 상태 `완료` (커밋 `3b66d3f`까지). 8단계 추가로 상태를 `진행 중`으로 되돌렸다
- **8단계 리뷰 범위:** `3b66d3f` 이후 변경
- **남은 사람 확인** (1~7단계에서 넘어온 것, 8단계 검증과 별개)
  - [ ] Vercel `NOTES_QR_SECRET` 저장 여부 (`.env.local`과 같은 값). 배포 뒤에 저장했다면 Redeploy
  - [ ] 실제 QR 1장 휴대폰 확인 — 명단 열기 → 체크 → `/notes/summary` 반영 → 해제 (체크포인트 E). 명단이 열리면 위 항목도 확인된 것
  - [ ] Vercel Analytics 대시보드에 `/notes/c/` 뒤 토큰이 보이지 않음 (QR 접속이 생긴 뒤)
  - [ ] 반별 QR 인쇄·부착 후 몇 장 찍어 반이 맞는지 확인
배포 후 사용자 요청. 체크 화면이 올해 지난 일요일을 모두 보여 줘 연말에는 칩이 44개가 넘고, 지난 기수 날짜는 체크할 일이 없다.
- 결정: **숨김 + 3주 유예 + 서버도 같은 기준** (2026-11-08 사용자 결정)
  - 지난 기수 날짜는 비활성화하지 않고 **칩에서 뺀다** — 못 누르는 칩은 정보가 없고 지금 기수 날짜를 찾기 어렵게 한다
  - 새 기수가 시작된 날부터 **21일 동안은 같은 해 지난 기수의 일요일 전체**를 함께 보여 준다 — 기수 마지막 주를 다음 주에 몰아서 체크하는 경우를 막지 않기 위해서다. 예: 3기(9/1~)는 9/21까지 2기 날짜 포함, 9/22부터 3기만
  - 서버도 같은 함수(`checkableSundays`)로 검증 — 화면만 숨기면 시상 명단을 확정한 뒤에도 API로 지난 기수 기록이 바뀔 수 있다
  - 1기는 지난 기수가 지난해 3기라 유예가 없다(기존 "지난해 날짜 저장 불가" 규칙 유지, 3기는 12월 31일 안에 체크)
  - 관리자 출석 수정 폼·출석 현황의 날짜 목록(`sundaysThisYear`)은 바꾸지 않는다 — 말씀노트 전용 규칙이다
- [x] 작업 20: `src/lib/notes-period.ts`에 `checkableSundays(sundays, today)`·`NOTES_GRACE_DAYS = 21` — 다른 파일을 import하지 않는 순수 함수(검사 스크립트가 Node로 직접 불러온다)
- [x] 작업 21: `src/app/api/notes/class/route.ts` 날짜 검증을 `checkableSundays`로 교체 (GET·POST 모두, 범위 밖은 400)
- [x] 작업 22: `src/components/notes/ClassNotesScreen.tsx` 날짜 칩을 같은 함수로 계산. 탭 복귀 시 목록이 바뀌면 다시 계산하고, 유예가 끝나 고른 날짜가 빠졌으면 기본 날짜로 되돌림
- [x] 작업 23: 검사 스크립트 — `verify-notes-lib.mjs`에 경계 7건(유예 마지막 날·다음 날·1기·새해 첫 일요일 전 등), `verify-notes-api.mjs`는 고정 날짜(3월) 대신 지금 체크 가능한 최근 일요일 2개로 검사하고 범위 밖 날짜 400 추가
- [x] 작업 24: 문서 — 사용 안내 말씀노트 3단계 문구, `CLAUDE.md`(화면 표·인증 구조), `spec.md` 날짜 규칙, `docs/context-notes.md` 결정 근거

### 체크포인트 F: 기수 단위 날짜
- [x] `node scripts/verify-notes-lib.mjs` — 경계 날짜 7건 통과 `[스크립트]`
- [x] `node scripts/verify-notes-api.mjs` — 범위 안 200, 평일·미래·지난해·범위 밖 400, 기존 항목 전부 통과·잔존 더미 0 `[스크립트]` (dev 서버 필요, **예배 시간을 피해서** 실행)
- [x] 체크 화면 375px — 오늘 기준 칩이 지금 기수만 나옴(2026-11 기준 3기 9/6~). 브라우저 시계를 9/15·9/22로 옮겨 유예 중에는 2기 포함, 끝난 뒤에는 3기만 `[Playwright 스크립트]`
- [x] 탭 복귀 — 유예 중 2기 날짜를 고른 채 시계를 유예 뒤로 옮기면 기본 날짜로 돌아감 `[Playwright 스크립트]`
- [x] `npm run test:e2e`·`npx tsc --noEmit`·`npm run build` 통과
- [x] 사용 안내 `80~82` 재촬영 후 칩 표시가 어색하지 않음 (가짜 데이터, 포트 3100) — 촬영일이 같은 3기라 칩 구성이 같아 커밋본 유지

## 작업 상세
단계 단위로 묶어 적는다. 작업별 내용은 "작업 목록"의 설명이 대신하고, 검증 절차는 각 체크포인트 항목이 맡는다.
완료 기준은 그 단계의 작업을 모두 체크할 때 함께 체크하고, 검증은 VERIFY에서 실제로 확인한 것만 체크한다.

#### 1단계: 기반 (작업 1~5)
**완료 기준:**
- [x] 실시트에 `SermonNotes` 탭과 헤더 7개가 있고 `verify-sheets.mjs`가 탭 4개를 확인한다
- [x] 토큰 생성·해석이 반 단위로 맞고 비밀값은 저장소에 없다
- [x] 기간 유틸이 올해 3개 기간과 경계 날짜를 맞게 돌려주고, `/api/stats/rates`의 반기 분모는 이동 전과 같다

**검증:**
- [x] 체크포인트 A 전체
- [x] `npx tsc --noEmit`

**의존:** 없음 (작업 2가 작업 3의 선행, `NOTES_QR_SECRET` 값은 사용자가 `.env.local`·Vercel에 등록)

**예상 파일:** `scripts/add-sermon-notes-sheet.mjs`, `scripts/print-notes-qr-urls.mjs`, `scripts/verify-sheets.mjs`, `src/lib/sheets.ts`, `src/lib/notes-token.ts`, `src/lib/notes-period.ts`, `src/lib/date.ts`, `src/app/api/stats/rates/route.ts`, `.env.local.example`, `docs/security-checklist.md`

**규모:** 작업별 S

#### 2단계: API (작업 6~9)
**완료 기준:**
- [x] 토큰 API가 반 범위·날짜를 서버에서 강제하고 응답에 이름 외 개인정보가 없다
- [x] 집계가 새친구를 빼고 인당 하루 1회로 세며, 분모는 기간 전체 일요일 수다
- [x] 학생 삭제가 SermonNotes 기록까지 지운다

**검증:**
- [x] 체크포인트 B 전체

**의존:** 1단계

**예상 파일:** `src/app/api/notes/class/route.ts`, `src/app/api/notes/summary/route.ts`, `src/app/api/students/[id]/route.ts`, `src/api/notes.ts`, `src/hooks/useClassNotes.ts`, `src/hooks/useNotesSummary.ts`

**규모:** 작업별 S~M

#### 2.5단계: UI 시안 (작업 9-1~9-3)
**완료 기준:**
- [x] 화면 A·B 시안이 각 2~3안 있고 더미 데이터만 쓴다
- [x] 확정안이 "설계 결정"에 기록되어 있다

**검증:**
- [x] 체크포인트 B2 (사용자 승인)

**의존:** 2단계 응답 형태

**예상 파일:** 저장소 파일 없음(아티팩트), `plan.md`

**규모:** 작업별 S

#### 3단계: 화면 A (작업 10~11-2)
**완료 기준:**
- [x] QR 링크로 그 반 명단이 열리고 체크·해제가 즉시 반영되며 실패 시 롤백된다
- [x] 날짜는 기본 최근 일요일이고 올해 일요일만 고를 수 있으며 결석 학생이 흐리게 표시된다
- [x] Playwright가 실시트 없이 돌고 롤백·잘못된 토큰 테스트가 통과한다
- [x] `GET /api/notes/class`가 시트 읽기 요청 1번으로 같은 응답을 준다

**검증:**
- [x] 체크포인트 C 전체

**의존:** 2단계, 체크포인트 B2

**예상 파일:** `src/app/notes/c/[token]/page.tsx`, `src/components/notes/ClassNotesScreen.tsx`, `src/components/notes/NoteCheckCard.tsx`, `src/hooks/useClassNotes.ts`, `src/lib/sheets.ts`, `src/app/api/notes/class/route.ts`, `playwright.config.ts`, `tests/e2e/mock.ts`, `tests/e2e/notes.spec.ts`, `package.json`, `package-lock.json`, `.gitignore`

**규모:** 작업별 S~M

#### 4단계: 화면 B (작업 12~14-1)
**완료 기준:**
- [x] 종합 목록이 횟수순으로 나오고 12회 구분선과 올해 기간·세션 탭·시상 명단 복사가 동작한다
- [x] admin 통과 전에는 다른 화면을 거쳐 와도 데이터가 렌더되지 않는다
- [x] `/members` 버튼을 넣어도 헤더가 640·1024px에서 넘치지 않는다

**검증:**
- [x] 체크포인트 D 전체

**의존:** 2단계, 체크포인트 B2, 작업 11-1(Playwright)

**예상 파일:** `src/components/notes/NotesSummaryList.tsx`(+ 스켈레톤), `src/app/notes/summary/page.tsx`, `src/app/members/page.tsx`, `src/components/layout/Header.tsx`, `tests/e2e/gates.spec.ts`

**규모:** 작업별 S~M

#### 5단계: 사용 안내 (작업 15~16)
**완료 기준:**
- [x] 새 캡처가 가짜 데이터로만 찍혀 `public/guide/`에 있다
- [x] `/guide`에 말씀노트 절과 총무팀 카드 항목이 있고 접힘·앵커가 동작한다

**검증:**
- [x] 16-5 캡처 회귀 결과 확인
- [x] `/guide` 새 절 펼침·앵커 이동 수동 확인 `[agent-browser]`

**의존:** 3·4단계

**예상 파일:** `guide/mock/intercept.js`, `guide/mock/data.json`, `guide/pages/shots.json`, `public/guide/*.png`, `src/app/guide/page.tsx`

**규모:** 작업별 M

#### 6단계: 회귀 점검 (작업 16-1~16-6)
**완료 기준:**
- [x] 손댄 기존 파일이 "영향 범위" 표와 일치한다
- [x] 기존 7개 화면·API 동작이 그대로다
- [x] 결과가 "회귀 점검 결과"에 기록되어 있다

**검증:**
- [x] 체크포인트 E0 전체

**의존:** 1~5단계

**예상 파일:** `plan.md`, 발견 문제에 따른 수정 파일

**규모:** 작업별 S

#### 7단계: 문서·마무리 (작업 17~19)
**완료 기준:**
- [x] CLAUDE.md·`docs/`·`.claude/feature-workflow.md`가 이번 변경과 맞다
- [x] 연간 운영 문서에 탭 4개와 3기 명단 복사 단계가 있다
- [x] 보안 체크리스트 대조에서 비밀값·실제 토큰·QR URL·실명이 없다 (작업본 기준, 과거 커밋의 이름 2명은 사용자 결정으로 유지)

**검증:**
- [ ] 체크포인트 E 전체

**의존:** 6단계

**예상 파일:** `CLAUDE.md`, `docs/yearly-sheet-operation.md`, `docs/migration-progress.md`, `docs/context-notes.md`, `docs/security-checklist.md`, `.claude/feature-workflow.md`

**규모:** 작업별 S

#### 8단계: 기수 단위 날짜 (작업 20~24)
**완료 기준:**
- [x] 체크 화면 칩과 서버 검증이 같은 함수로 같은 날짜 범위를 쓴다
- [x] 새 기수 시작 후 21일까지만 지난 기수 날짜가 포함된다 (경계 검사)
- [x] 기존 기능(출석 수정 폼·출석 현황 날짜)은 바뀌지 않는다

**검증:**
- [x] 체크포인트 F 전체

**의존:** 7단계(배포 완료)

**예상 파일:** `src/lib/notes-period.ts`, `src/app/api/notes/class/route.ts`, `src/components/notes/ClassNotesScreen.tsx`, `scripts/verify-notes-lib.mjs`, `scripts/verify-notes-api.mjs`, `src/app/guide/page.tsx`, `CLAUDE.md`, `docs/context-notes.md`, `spec.md`, `plan.md`

**규모:** S

#### 8단계 이후 진행 방법 (VERIFY·REVIEW·SHIP)
프로젝트 설정 `.claude/feature-workflow.md`를 따른다. 단계마다 사용자가 명령을 입력해야 넘어간다.

1. **테스트** — `/feature-workflow test sermon-notes`
   - 명령: `npm run test:e2e` → `npx tsc --noEmit` → `npm run build` (평소 dev 서버를 끄고 실행 — E2E가 포트 3200에 자체 서버를 띄운다)
   - 화면: `npm run dev` + 브라우저로 체크포인트 F의 화면 항목 확인. 실제 이름·토큰은 출력하지 않고 스크린샷은 임시 폴더에만
   - 실시트 쓰기 검사는 예배 시간을 피한다 (운영과 같은 서비스 계정의 분당 읽기 한도를 나눠 쓰고, Attendance는 동시 삭제 위험이 남아 있다)
   - 결과를 `verify.md`에 "기수 단위 날짜" 절로 추가, 통과하면 상태 `검증 완료`
2. **리뷰** — `/feature-workflow review sermon-notes`
   - 범위: `3b66d3f` 이후 변경 (8단계)
   - `code-review`로 버그, 보안 점검(`security-review` 스킬이 `origin/HEAD` 없이 실패하면 직접 코드 확인), `docs/security-checklist.md` 4항목 대조
   - 수정은 사용자가 고른 항목만, 고치면 1번 검증을 다시 실행. 끝나면 상태 `리뷰 완료`
3. **배포 판정·문서·커밋 메시지** — `/feature-workflow ship sermon-notes`
   - `deploy-gate`로 GO/NO-GO 판정 (기준 브랜치 `main`)
   - `docs/migration-progress.md` 말씀노트 항목에 8단계 추가, 판단 근거는 `docs/context-notes.md`, 화면·API가 바뀐 부분은 `CLAUDE.md`
   - 상태 `완료`
   - **커밋 메시지 초안만 제시한다. 커밋·푸시는 사용자가 직접 한다**

## 회귀 점검 결과
2026-11-07, 커밋 `d89c30c` 기준 (작업 트리 깨끗한 상태에서 시작).

| 작업 | 결과 | 비고 |
|------|------|------|
| 16-1 변경 범위 | 통과 | `main...HEAD`는 111개 파일로 `dev`의 미배포 작업까지 섞여 말씀노트 범위(`b67605a..HEAD`, 36개 파일)로 대조했다. 표에 없던 `.env.local.example`·`src/lib/date.ts`·`guide/README.md`를 표에 추가하고 `Header.tsx`·`data.json`은 바뀌지 않아 고쳤다 |
| 16-2 정적 점검 | 통과 | `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` 5개. 기존 7개 화면 라우트 생성 |
| 16-3 데이터 점검 | 통과 (쓰기는 대체) | `verify-sheets.mjs` 탭 4개 통과. `verify-read-api.mjs`는 attendance 2건 외 통과 — API가 커밋 `255f4ce`부터 세션 필터를 쓰지 않는데 스크립트만 세션별로 세는 기존 불일치(147 = 93 + 54). **`verify-write-api.mjs`는 실행하지 않았다** — 파일에 "사본 시트 전용"으로 표시돼 있고 실제 행을 지웠다 다시 넣는다. 대신 16-4 쓰기 흐름으로 확인했다 |
| 16-4 기존 화면 | 통과 | 375·1024px에서 `/`·`/history`·`/birthday`·`/guide`·`/registry`·`/members`·`/teachers`·`/notes/summary` 진입, 가로 넘침·오류 문구·페이지 오류 없음. 세 게이트 독립 유지, 틀린 비밀번호 차단. `/` polling 33초에 2회. 더미 학생으로 `/members` 등록·수정·출석 추가·삭제 → Students·Attendance·SermonNotes 잔존 0. `agent-browser` 대신 Playwright 스크립트로 실행(이름·비밀번호 미출력) |
| 16-5 캡처 회귀 | 통과 | 42장 전체 재촬영 후 커밋본과 픽셀 비교. 29장 0%, 13장(`10`·`11`·`22`·`30~35`·`40~42`·`73`)은 차이 있음 — 기존 캡처가 2026-10-07 촬영이라 날짜·생일 달·가짜 출석이 달라진 결과다(최대 `42` 34.8%, `35` 10.0%, 둘은 직접 보고 빨간 네모·내용 정상 확인, 나머지 11장은 차이 범위만 확인). 이번 변경과 무관한 15장은 커밋본을 유지했다 |

**확인하지 못한 것**
- `/` 화면의 출석 카드 토글은 UI로 누르지 못했다. 점검일이 토요일이라 카드가 잠겨 있다. 같은 `POST /api/attendance`는 `/members`의 출석 추가로 확인했다. 다음 주일 또는 VERIFY에서 시계를 옮겨 확인한다.
- `verify-write-api.mjs`의 레거시 행(Type 빈 값) 토글 시나리오는 이번 변경과 무관해 재현하지 않았다.

## 보안 점검 결과
2026-11-07, 추적 텍스트 파일 전체를 실제 값과 대조했다(값은 출력하지 않음). 이미지는 대조하지 않았고, 캡처는 가짜 데이터로만 만들었다.

- 비밀값·실제 스프레드시트 ID·QR 토큰 35개·실제 연락처 733개: 일치 0건. `.env.local`·`docs/legacy-gas.json`·`test-results/`·`guide/capture/raw/`는 추적되지 않음
- 실제 이름 434개: 이번 기능 파일에는 없음. plan의 일치 1건은 일반 단어다
- **기존 문제 발견:** `docs/context-notes.md`에 실제 학생 이름 2명이 있었다(커밋 `7c14709`, 2026-07-10부터 `origin/main` 포함). 작업본은 `학생A`·`학생B`로 바꿨다
- **결정 (2026-11-07 사용자):** 작업본 수정만 유지한다. git 히스토리는 다시 쓰지 않으므로 과거 커밋에는 이름이 남는다

## 리뷰 결과
2026-11-07, 범위 `b67605a..83d85ff`. 정확성 지적 10건을 사용자 결정으로 모두 수정했다.

| # | 수정 |
|---|------|
| A | 학생 삭제 순서 변경 — 출석·말씀노트를 먼저 정리하고 학생 행을 마지막에 지워 실패해도 재시도 가능 |
| B | 저장 실패 시 학생 이름과 함께 안내 표시, 다시 눌러 성공하면 사라짐 |
| C | `SiteAnalytics`의 `beforeSend`로 말씀노트 토큰 주소를 가림 |
| D | 저장·집계도 `readSheets` 사용 — 체크 1번당 시트 읽기 2회 → 1회 |
| E | 운영 문서·사용 안내에 3기 복사 기한을 12월 31일로 명시 |
| F | `isNoteTarget`에 ID 필수 조건 추가 (현재 시트의 빈 ID는 0건) |
| G | 해제·학생 삭제 시 행을 지우지 않고 `해제` 표시(`retireRowsWhere`) — 행 번호가 밀리지 않음 |
| H | 탭으로 돌아왔을 때 일요일이 바뀌었으면 새 일요일을 기본으로 |
| I | 다른 날짜 조회 실패 시 반 제목·날짜 칩을 남기고 명단 영역에만 오류 표시 |
| J | 저장 후 다른 날짜의 캐시도 새로 받음 (`refetchType: "all"`) |

**수정 후 재검증:** E2E 6개, `tsc`, `build`, `verify-notes-lib`, `verify-sheets`, `verify-notes-api`(동시 해제 항목 추가), 더미 학생 UI 흐름, 실시트 토큰 33개·집계·브라우저 2개 체크/해제, 시계를 옮긴 탭 복귀 확인 통과. 검증이 남긴 `해제` 행 9개는 실시트에서 정리했다(정리 후 0행).

**확인하지 못한 것**
- A의 실패 경로: 시트 오류를 일부러 만들지 않았다. 순서는 코드로, 정상 삭제는 실제 동작으로 확인했다.
- C의 실제 전송: Analytics 스크립트는 Vercel 배포에서만 동작한다. 치환 함수는 `verify-notes-lib.mjs`로 확인했고, 배포 후 대시보드에 토큰이 없는지 본다.
- 보안 점검: `security-review` 스킬이 `origin/HEAD`가 없어 실행되지 않아 직접 코드를 읽어 점검했다.
