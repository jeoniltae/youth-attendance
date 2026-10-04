# 구현 계획: 출석부 사용 안내 페이지 (usage-guide)

- spec: ./spec.md (`docs/plans/2026-10-04-usage-guide/spec.md`)
- 상태: 진행 중

## 개요
메인 화면(PC 헤더 버튼·모바일 메뉴)에서 들어가는 `/guide` 페이지를 만든다. 출석 체크·확인, 출석현황, 생일자, 학생 관리(등록·교사 현황 포함) 사용법을 휴대폰 캡처와 함께 보여 준다. 캡처는 배포되지 않는 `guide/` 작업 폴더에서 **가짜 데이터로** 만들고, 완성 이미지만 `public/guide/`로 복사한다. 스프레드시트는 건드리지 않는다.

## 설계 결정
- **가짜 데이터 공급은 `agent-browser --init-script`로 페이지의 `fetch`를 가로챈다** ⚠️ spec과 다른 점
  - spec은 `network route --body`(고정 응답)였지만, 출석 누르기·등록·삭제처럼 **상태가 바뀌는 장면**을 자연스럽게 찍으려면 브라우저 안에서 상태를 기억하는 가로채기가 필요하다
  - `network route "**/api/**" --abort`는 **안전망**으로 함께 건다(가로채기가 놓친 요청은 서버에 닿지 않고 실패)
  - spec의 의도(요청 가로채기 + 더미 데이터, 시트 호출 0회, `src/` 무변경)는 그대로 지킨다
- 인증: init script가 `sessionStorage`에 `session_token`·`admin_token`을 미리 넣고, `/api/auth`도 가로채 성공 응답 → 비밀번호 창 장면도 찍을 수 있음(가짜 비밀번호 입력)
- 촬영용 dev 서버는 `GOOGLE_*` 환경변수를 빈 값으로 덮어 실행(프로세스 환경변수가 `.env.local`보다 우선) → 이중 안전장치. 실행 전 이 우선순위가 실제로 먹는지 T2에서 확인
- 촬영 목록은 데이터(`guide/pages/shots.json`)로 둔다: 장면 id·URL·사전 동작(클릭 등)·빨간 네모 좌표(%) → 촬영 스크립트와 합성 스크립트가 같은 목록을 읽는다
- 날짜 의존 데이터(오늘 출석, 최근 N주 기록, 이번 달/다음 달 생일)는 init script가 **촬영 시점 기준으로 생성**한다 → 언제 다시 찍어도 같은 모습
- `/guide` 페이지는 완성 이미지 + 글만. 이미지는 `next/image`(width/height 지정)로 표시
- 진입 버튼 아이콘은 lucide `CircleHelp`. PC 버튼 스타일은 `/members`의 `교사 현황` 링크(테두리형) 클래스를 그대로 쓴다

## 작업 목록

### 1단계: 촬영 파이프라인 (위험이 가장 큰 부분 먼저)
- [ ] 작업 1: 가짜 시트 — `guide/mock/` 더미 데이터 + fetch 가로채기 init script
- [ ] 작업 2: 촬영 스크립트 — `guide/capture/` + 촬영 목록 `guide/pages/shots.json` + 안전장치
- [ ] 작업 3: 합성 — `guide/pages/` 휴대폰 틀·빨간 네모 HTML → `guide/output/` → `public/guide/` 복사

### 체크포인트 A: 파이프라인
- [ ] 메인 화면 1장이 raw 촬영 → 합성 → `public/guide/`까지 한 번에 나온다
- [ ] 촬영 중 Next 서버 로그에 `/api/*` 요청이 0건

### 2단계: 페이지 골격과 진입
- [ ] 작업 4: `/guide` 페이지 골격 + 가이드 컴포넌트 + 교사용 게이트
- [ ] 작업 5: 메인 화면 진입 버튼 (PC 헤더 + 모바일 메뉴)

### 체크포인트 B: 골격
- [ ] 메인 → 사용 안내 → 1절 이미지가 보인다 (PC·모바일)
- [ ] `npx tsc --noEmit`, `npm run build` 통과
- [ ] 미인증 직접 진입 시 게이트, 메인에서 인증 후 이동 시 바로 열림

### 3단계: 절별 콘텐츠 (촬영 장면 + 글)
- [ ] 작업 6: 1절 출석 체크하기 · 2절 출석 확인하기
- [ ] 작업 7: 3절 출석현황 보기 · 4절 생일자 보기
- [ ] 작업 8: 5절 학생 관리 ① 들어가기 · 등록하기(학생·새친구·교사)
- [ ] 작업 9: 5절 학생 관리 ② 정보 고치기 · 지난 출석 고치기 · 지우기
- [ ] 작업 10: 5-6 교사 현황 보기 · 6절 자주 묻는 것

### 체크포인트 C: 콘텐츠
- [ ] 5개 절 + FAQ, 상단 바로가기 동작
- [ ] 사용자 시나리오 1~7을 가이드만 보고 따라 할 수 있다
- [ ] 모든 이미지가 더미 데이터 (실명·실연락처 없음)
- [ ] 375px 폭에서 가로 스크롤 없음, `md` 이상 좌우 배치

### 4단계: 문서
- [ ] 작업 11: `guide/README.md` — 다시 찍는 법
- [ ] 작업 12: 프로젝트 문서 갱신 (CLAUDE.md · migration-progress · context-notes)

### 체크포인트: 완료
- [ ] spec 성공 기준 전부 충족
- [ ] REVIEW 준비됨

## 작업 상세

#### 작업 1: 가짜 시트 (mock)
**설명:** `guide/mock/data.json`에 세션별 학생·교사 더미 명단을 두고, `guide/mock/intercept.js`(init script)가 `window.fetch`를 감싸 `/api/*`를 메모리 상태로 처리한다. GET 명단/출석/기간/생일/통계, POST·PUT·DELETE 학생·교사, POST 출석 토글, POST 인증을 지원하고 처리하지 않은 `/api` 경로는 오류 응답 + `console.error`로 드러낸다. 날짜 의존 데이터는 촬영 시점 기준으로 생성.
**완료 기준:**
- [ ] `src/api/*.ts`의 응답 타입(roster·attendance·range·birthdays·stats·member·rates·students·teachers·auth)을 모두 만족
- [ ] 더미 값만 사용 (이름은 가상 인물, 연락처 `010-0000-0000` 형태)
- [ ] 생일: 이번 달·다음 달 생일자 + 음력 교사 1명 이상 / 교사: 팀 3개 이상, 출석률 값 분포(높음·중간·낮음)
**검증:**
- [ ] 수동 확인: 촬영용 dev 서버 + `agent-browser open --init-script` 로 `/`·`/history`·`/birthday`·`/members`·`/teachers`가 비밀번호 없이 더미 데이터로 뜬다
**의존:** 없음
**예상 파일:** `guide/mock/data.json`, `guide/mock/intercept.js`
**규모:** M

#### 작업 2: 촬영 스크립트
**설명:** `guide/capture/capture.mjs`가 `guide/pages/shots.json`을 읽어 장면마다 `agent-browser` 명령(viewport 390×844 배율 2, open, 클릭·입력 등 사전 동작, screenshot)을 실행해 `guide/capture/raw/<id>.png`로 저장한다. 시작 시 `network route "**/api/**" --abort`를 먼저 건다. dev 서버는 `GOOGLE_*`를 빈 값으로 덮어 띄운다(스크립트가 직접 띄우거나 README에 명령으로 안내).
**완료 기준:**
- [ ] `node guide/capture/capture.mjs [id...]`로 전체 또는 일부 장면만 다시 찍을 수 있다
- [ ] 실행 전 `.env.local`의 시트 ID가 서버에 전달되지 않음을 확인(빈 값 덮어쓰기 동작 확인)
- [ ] 메인 화면 장면 1개가 raw로 저장된다
**검증:**
- [ ] 수동 확인: 촬영 중 dev 서버 로그에 `/api` 요청 없음, `agent-browser network requests`에 서버로 간 `/api` 요청 없음
**의존:** 작업 1
**예상 파일:** `guide/capture/capture.mjs`, `guide/pages/shots.json`
**규모:** M

#### 작업 3: 합성
**설명:** `guide/pages/frame.html`이 쿼리로 장면 id를 받아 raw 캡처를 휴대폰 틀에 넣고 `shots.json`의 좌표로 빨간 네모(번호 배지 포함)를 그린다. `guide/pages/compose.mjs`가 장면마다 이 HTML을 열어 틀 요소만 스크린샷 → `guide/output/<id>.png` → `public/guide/`로 복사. 스타일은 참고 아티팩트의 `.phone`/`.mark` 규칙을 앱 토큰 값으로 옮긴다.
**완료 기준:**
- [ ] 빨간 네모·번호 배지가 이미지에 구워져 있다(애니메이션 없음)
- [ ] `public/guide/`에는 완성본만 들어간다(raw 없음)
**검증:**
- [ ] 수동 확인: 메인 화면 완성본을 열어 네모 위치가 의도한 버튼과 맞는지 본다
**의존:** 작업 2
**예상 파일:** `guide/pages/frame.html`, `guide/pages/compose.mjs`, `guide/output/`, `public/guide/`
**규모:** S

#### 작업 4: `/guide` 페이지 골격
**설명:** `src/app/guide/page.tsx`(client) — `useAuthGate("session")` + `PublicGate`로 감싸고(`src/app/history/page.tsx`와 같은 패턴), 상단 제목·소개·바로가기, 절(section) 반복. `src/components/guide/`에 `GuideSection`(절 머리)·`GuideStep`(번호+글+이미지, 모바일 세로/`md` 좌우)·`GuideFaq`(details 접기)·`GuideWarning`(경고 상자). 메인으로 돌아가는 링크는 **모바일에서도 보이게**(history 페이지의 뒤로 링크는 `sm` 이상만 보임). 새 파일 상단 한국어 한 줄 주석.
**완료 기준:**
- [ ] 1절 이미지 1장 이상으로 레이아웃이 모바일·PC 모두 맞다
- [ ] 바로가기 클릭 시 해당 절로 스크롤
- [ ] 게이트 통과 전에는 본문을 렌더하지 않는다
**검증:**
- [ ] `npx tsc --noEmit`
- [ ] 수동 확인: 390px·1280px에서 레이아웃
**의존:** 작업 3
**예상 파일:** `src/app/guide/page.tsx`, `src/components/guide/GuideSection.tsx`, `GuideStep.tsx`, `GuideFaq.tsx`, `GuideWarning.tsx`
**규모:** M

#### 작업 5: 진입 버튼
**설명:** `src/app/page.tsx` 헤더 actions의 `학생 관리` 링크 뒤에 테두리형 `사용 안내` 링크(`CircleHelp` 아이콘, `/members`의 `교사 현황` 클래스와 동일), `MobileNavMenu` items 맨 끝에 `{ key: "guide", label: "사용 안내", icon: CircleHelp, href: "/guide" }`.
**완료 기준:**
- [ ] PC(`sm` 이상) 헤더와 모바일 메뉴 모두에서 `/guide`로 이동
- [ ] 기존 버튼 줄바꿈·정렬이 깨지지 않음(640·768·1024px)
**검증:**
- [ ] `npx tsc --noEmit`
- [ ] 수동 확인: 세 폭에서 헤더 확인
**의존:** 작업 4
**예상 파일:** `src/app/page.tsx`
**규모:** XS

#### 작업 6: 1절 출석 체크하기 · 2절 출석 확인하기
**설명:** 장면 추가(세션 확인, 카드 누르기 전/후 도장, 다시 눌러 취소, 반 필터, 요약 숫자, 미출석 카드 대신 누르기, 지난 날짜 잠금 안내) + 본문. "카드는 오늘만", "다른 기기는 30초 뒤 반영", "PC에서는 헤더 버튼" 안내 포함.
**완료 기준:**
- [ ] 시나리오 1·2를 가이드만 보고 따라 할 수 있다
- [ ] 이미지 전부 더미
**검증:**
- [ ] `npm run build`
- [ ] 수동 확인: 시나리오 1·2 따라가기
**의존:** 작업 5
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 7: 3절 출석현황 · 4절 생일자
**설명:** 출석현황(날짜·기간 선택, 반별 차트, 행 눌러 명단 모달, 기간 모드 배지) + 생일자(진입, 세션, 이전/다음 달, 그룹별 명단, `(음력)` 표시) 장면과 본문.
**완료 기준:**
- [ ] 시나리오 3·4를 가이드만 보고 따라 할 수 있다
**검증:**
- [ ] 수동 확인: 시나리오 3·4 따라가기
**의존:** 작업 6
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 8: 5절 ① 들어가기 · 등록하기
**설명:** 관리자 비밀번호 창(가짜 입력), 헤더의 `학생`·`교사`·`새친구` 버튼(모바일 짧은 이름), 학생 등록 폼(필수 칸), 새친구 등록(학년 고정·반 비활성), 교사 등록(팀), 등록 후 메인에 카드 생김.
**완료 기준:**
- [ ] 시나리오 5의 등록 부분을 따라 할 수 있다
- [ ] 세 등록 버튼의 차이가 글과 이미지로 구분된다
**검증:**
- [ ] 수동 확인: 시나리오 5(등록) 따라가기
**의존:** 작업 7
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 9: 5절 ② 고치기 · 지난 출석 · 지우기
**설명:** 정보 고치기(교사도 같은 방식, 새친구 → 학년·반 편입 팁), 폼의 지난 출석 수정, 지우기(경고 상자: 출석 기록 함께 삭제·되돌릴 수 없음, 확인 단계).
**완료 기준:**
- [ ] 시나리오 2의 "지난주 기록 고치기"와 시나리오 5의 편입 부분을 따라 할 수 있다
- [ ] 지우기 절에 경고 상자가 있다
**검증:**
- [ ] 수동 확인: 해당 시나리오 따라가기
**의존:** 작업 8
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 10: 5-6 교사 현황 · 6절 자주 묻는 것
**설명:** 교사 현황(진입·세션/팀 탭·이름 검색·정렬·연락처 눌러 전화·출석률 읽는 법) 장면과 본문, FAQ(비밀번호 흔들림, 저장이 안 될 때, 다른 기기 반영 지연, 잘못 지웠을 때, 카드가 안 눌릴 때 등).
**완료 기준:**
- [ ] 시나리오 6을 따라 할 수 있다
- [ ] FAQ 5개 이상, 접고 펼쳐진다
**검증:**
- [ ] 수동 확인: 시나리오 6 따라가기
**의존:** 작업 9
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** S

#### 작업 11: `guide/README.md`
**설명:** 폴더 역할, 촬영 서버 띄우는 명령(환경변수 비우기), `capture.mjs`·`compose.mjs` 실행 순서, 장면 추가 방법(`shots.json`), 안전장치 설명, "실데이터 화면 저장 금지".
**완료 기준:**
- [ ] README만 보고 장면 하나를 다시 찍어 `public/guide/`까지 반영할 수 있다
**검증:**
- [ ] 수동 확인: README 절차대로 장면 1개 재촬영
**의존:** 작업 10
**예상 파일:** `guide/README.md`
**규모:** XS

#### 작업 12: 프로젝트 문서 갱신
**설명:** `.claude/feature-workflow.md` PLAN 의무에 따른 작업. `CLAUDE.md` 화면 표(6→7)·폴더 구조(`guide/`, `src/app/guide`, `src/components/guide`, `public/guide`), `docs/migration-progress.md` 항목, `docs/context-notes.md` 맨 위에 판단 근거(fetch 가로채기 선택 이유, 만드는 곳/보여주는 곳 분리, 이미지 합성) + 목차.
**완료 기준:**
- [ ] 세 문서가 실제 구조와 맞다
- [ ] 문서에 실데이터·비밀값 없음
**검증:**
- [ ] 수동 확인: 문서 diff 검토
**의존:** 작업 11
**예상 파일:** `CLAUDE.md`, `docs/migration-progress.md`, `docs/context-notes.md`
**규모:** S

## 위험과 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| init script가 Next 클라이언트의 첫 fetch보다 늦게 붙음 | 상 | 작업 1에서 가장 먼저 확인. 실패 시 `network route --body` 고정 응답 + 장면별 응답 교체로 후퇴(spec 원안) |
| 가로채기 누락으로 실시트에 요청 | 상 | `**/api/**` abort 안전망 + 촬영 서버 환경변수 비우기 + 서버 로그 0건 확인(체크포인트 A) |
| 환경변수 빈 값 덮어쓰기가 `.env.local`에 밀림 | 중 | 작업 2에서 실제 확인. 안 되면 촬영 전용 `--env-file`/임시 env 파일로 대체 |
| 이미지 용량(30장 안팎) | 중 | `next/image`로 표시, 장면 수가 많으면 합성 결과를 적정 해상도로 저장 |
| 화면이 바뀌면 캡처가 낡음 | 하 | `shots.json` + README로 재촬영 1명령화 |
| 날짜에 따라 장면이 달라짐(오늘만 체크 가능 등) | 하 | 날짜 의존 데이터를 촬영 시점 기준 생성 |

## 열린 질문
- 없음 (spec과 다른 점: 가짜 데이터 공급 방식 → "설계 결정" 첫 항목, 승인 시 함께 확정)
