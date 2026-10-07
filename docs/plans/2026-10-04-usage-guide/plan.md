# 구현 계획: 출석부 사용 안내 페이지 (usage-guide)

- spec: ./spec.md (`docs/plans/2026-10-04-usage-guide/spec.md`)
- 상태: 완료 (2026-10-07 SHIP — deploy-gate GO. 이력: 리뷰 완료 — code-review 8건 중 6건 수정·2건 보류, 보안 점검 이상 없음)

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
- **(BUILD 중 추가)** 촬영 브라우저의 시계를 **가장 최근 일요일 11:00(KST)으로 고정**한다 — 메인 화면은 최근 일요일을 보여 주고 그날이 오늘일 때만 카드가 눌려서, 평일에 찍으면 모든 카드가 잠긴 화면이 나온다. init script가 `Date`만 옮기며 앱 코드는 그대로
- 개발 서버 표시(Next `N` 아이콘)·React Query 개발도구 버튼은 init script가 CSS로 숨긴다
- **(BUILD 2차, 2026-10-07)** 탐색 구조 — ① 현재 절 판단은 `IntersectionObserver` 대신 **스크롤 이벤트(프레임당 1회)** 로 "기준선을 지난 마지막 절"을 고른다. 절이 펼쳐지고 접히며 높이가 바뀌는 페이지라 관찰 영역을 맞추기보다 단순·정확 ② 390px 첫 화면에 절 6개가 다 들어오도록 **모바일에서 접힌 절은 설명을 숨기고** 제목만(펼치면·`sm` 이상은 설명 표시) ③ 5절 "학생 관리"는 페이지 끝 근처라 작은 주제가 접혀 있으면 더 못 내려가 제목이 바 아래 183px에서 멈춘다 — 가리지 않으므로 그대로 둔다(맨 아래 빈 공간을 넣어 맞추지 않음) ④ 5절 꼬리표를 "관리자용" → "총무팀용"(카드와 일치) ⑤ (사용자 확인) FAQ `<summary>`를 flex로 둬서 PC 크롬은 기본 ▶를 안 그리고 모바일 사파리는 그리던 차이 → 기본 표시를 모두 숨기고 `ChevronDown`(펼치면 회전)으로 통일 ⑥ 페이지 끝에서는 마지막 절이 기준선까지 못 올라와 강조가 앞 절(생일자)에 머물던 문제 → 끝에 닿으면 화면에 들어온 마지막 절을 강조 ⑦ (사용자 요청) 내비·카드·주소 앵커로 작은 주제가 있는 절(학생 관리)에 가면 **첫 작은 주제(들어가기)도 함께 펼침** — 절 머리 버튼으로 열 때는 절만 펼침(기존 동작)
- **(BUILD 중 추가)** 촬영 도구 보강 — ① 오늘 출석자는 `data.json`의 `todayPresent`로 고정(장면 예측 가능) ② 장면별 `clockDays`로 시계만 평일로(지난 예배 잠금 장면) ③ 요소 찾기에 `contains`·`up`·`tag` 옵션, `fill`·`select`는 label을 주면 안의 입력칸 사용 ④ eval을 블록으로 감싸 같은 페이지의 재선언 충돌 방지 ⑤ "추가됨 ✓"처럼 1.5초 뒤 사라지는 표시는 촬영 브라우저에서만 해당 타이머를 막아 고정
- 진입 버튼 아이콘은 lucide `CircleHelp`. PC 버튼 스타일은 `/members`의 `교사 현황` 링크(테두리형) 클래스를 그대로 쓴다
- **(BUILD 중 변경)** PC 헤더에 버튼을 더하니 640·1024px에서 줄이 넘쳤다 → ① 640px(`md` 미만)은 `?` 아이콘만(이름은 `aria-label`·`title`) ② `학생 관리`+`사용 안내`를 한 묶음으로(헤더 줄이 `justify-between`이라 따로 두면 학생 관리가 가운데로 밀림) ③ 공용 `Header.tsx`의 버튼 영역에 `lg:shrink-0` 추가 — 1024px에서 날짜 영역과 버튼 영역이 함께 줄어 버튼이 넘치던 문제. `/members`도 같은 Header를 쓰므로 함께 확인(1024·1100·1280px 한 줄 유지)

## 작업 목록

### 1단계: 촬영 파이프라인 (위험이 가장 큰 부분 먼저)
- [x] 작업 1: 가짜 시트 — `guide/mock/` 더미 데이터 + fetch 가로채기 init script
- [x] 작업 2: 촬영 스크립트 — `guide/capture/` + 촬영 목록 `guide/pages/shots.json` + 안전장치
- [x] 작업 3: 합성 — `guide/pages/` 휴대폰 틀·빨간 네모 HTML → `guide/output/` → `public/guide/` 복사

### 체크포인트 A: 파이프라인
- [x] 메인 화면 1장이 raw 촬영 → 합성 → `public/guide/`까지 한 번에 나온다
- [x] 촬영 중 Next 서버 로그에 `/api/*` 요청이 0건 (사전 점검 요청 외 0건 — 점검 요청은 모두 500)

### 2단계: 페이지 골격과 진입
- [x] 작업 4: `/guide` 페이지 골격 + 가이드 컴포넌트 + 교사용 게이트
- [x] 작업 5: 메인 화면 진입 버튼 (PC 헤더 + 모바일 메뉴)

### 체크포인트 B: 골격
- [x] 메인 → 사용 안내 → 1절 이미지가 보인다 (PC·모바일)
- [x] `npx tsc --noEmit`, `npm run build` 통과
- [x] 미인증 직접 진입 시 게이트, 메인에서 인증 후 이동 시 바로 열림

### 3단계: 절별 콘텐츠 (촬영 장면 + 글)
- [x] 작업 6: 1절 출석 체크하기 · 2절 출석 확인하기
- [x] 작업 7: 3절 출석현황 보기 · 4절 생일자 보기
- [x] 작업 8: 5절 학생 관리 ① 들어가기 · 등록하기(학생·새친구·교사)
- [x] 작업 9: 5절 학생 관리 ② 정보 고치기 · 지난 출석 고치기 · 지우기
- [x] 작업 10: 5-6 교사 현황 보기 · 6절 자주 묻는 것

### 체크포인트 C: 콘텐츠
- [x] 5개 절 + FAQ, 상단 바로가기 동작 (바로가기 6개 모두 해당 절로 이동, 마지막 FAQ는 페이지 끝이라 위에서 216px)
- [x] 사용자 시나리오 1~7을 가이드만 보고 따라 할 수 있다
- [x] 모든 이미지가 더미 데이터 (실명·실연락처 없음) — 36장 전부 mock 촬영, 시트 미접속 서버
- [x] 375px 폭에서 가로 스크롤 없음, `md` 이상 좌우 배치

### 4단계: 문서
- [x] 작업 11: `guide/README.md` — 다시 찍는 법
- [x] 작업 12: 프로젝트 문서 갱신 (CLAUDE.md · migration-progress · context-notes)

### 체크포인트: 완료 (1차 — 2026-10-05)
- [x] spec 성공 기준 전부 충족 (verify.md)
- [x] REVIEW 준비됨

### 5단계: 탐색 구조 (2026-10-06 추가 — 사용자 검토 "스크롤이 너무 길다")
- [x] 작업 13: 대상별 카드 + 절·작은 주제 접기 + 앵커 진입 시 펼침
- [x] 작업 14: 상단 고정 내비(모바일 칩 줄 / PC 왼쪽 목차) + 현재 절 강조 + 부드러운 스크롤

### 체크포인트 D: 탐색 구조
- [x] spec "탐색 구조" 성공 기준 7개 충족 (verify.md 2차)
- [x] 기존 시나리오 1~7을 접힌 화면에서 다시 따라갈 수 있다 (VERIFY 재실행 — 25/25)
- [x] REVIEW 준비됨

## 작업 상세

#### 작업 1: 가짜 시트 (mock)
**설명:** `guide/mock/data.json`에 세션별 학생·교사 더미 명단을 두고, `guide/mock/intercept.js`(init script)가 `window.fetch`를 감싸 `/api/*`를 메모리 상태로 처리한다. GET 명단/출석/기간/생일/통계, POST·PUT·DELETE 학생·교사, POST 출석 토글, POST 인증을 지원하고 처리하지 않은 `/api` 경로는 오류 응답 + `console.error`로 드러낸다. 날짜 의존 데이터는 촬영 시점 기준으로 생성.
**완료 기준:**
- [x] `src/api/*.ts`의 응답 타입(roster·attendance·range·birthdays·stats·member·rates·students·teachers·auth)을 모두 만족
- [x] 더미 값만 사용 (이름은 가상 인물, 연락처 `010-0000-0000` 형태)
- [x] 생일: 이번 달·다음 달 생일자 + 음력 교사 1명 이상 / 교사: 팀 3개 이상, 출석률 값 분포(높음·중간·낮음)
**검증:**
- [x] 수동 확인: 촬영용 dev 서버 + `agent-browser open --init-script` 로 `/`·`/history`·`/birthday`·`/members`·`/teachers`가 비밀번호 없이 더미 데이터로 뜬다
**의존:** 없음
**예상 파일:** `guide/mock/data.json`, `guide/mock/intercept.js`
**규모:** M

#### 작업 2: 촬영 스크립트
**설명:** `guide/capture/capture.mjs`가 `guide/pages/shots.json`을 읽어 장면마다 `agent-browser` 명령(viewport 390×844 배율 2, open, 클릭·입력 등 사전 동작, screenshot)을 실행해 `guide/capture/raw/<id>.png`로 저장한다. 시작 시 `network route "**/api/**" --abort`를 먼저 건다. dev 서버는 `GOOGLE_*`를 빈 값으로 덮어 띄운다(스크립트가 직접 띄우거나 README에 명령으로 안내).
**완료 기준:**
- [x] `node guide/capture/capture.mjs [id...]`로 전체 또는 일부 장면만 다시 찍을 수 있다
- [x] 실행 전 `.env.local`의 시트 ID가 서버에 전달되지 않음을 확인(빈 값 덮어쓰기 동작 확인)
- [x] 메인 화면 장면 1개가 raw로 저장된다
**검증:**
- [x] 수동 확인: 촬영 중 dev 서버 로그에 `/api` 요청 없음, `agent-browser network requests`에 서버로 간 `/api` 요청 없음
**의존:** 작업 1
**예상 파일:** `guide/capture/capture.mjs`, `guide/pages/shots.json`
**규모:** M

#### 작업 3: 합성
**설명:** `guide/pages/frame.html`이 쿼리로 장면 id를 받아 raw 캡처를 휴대폰 틀에 넣고 `shots.json`의 좌표로 빨간 네모(번호 배지 포함)를 그린다. `guide/pages/compose.mjs`가 장면마다 이 HTML을 열어 틀 요소만 스크린샷 → `guide/output/<id>.png` → `public/guide/`로 복사. 스타일은 참고 아티팩트의 `.phone`/`.mark` 규칙을 앱 토큰 값으로 옮긴다.
**완료 기준:**
- [x] 빨간 네모·번호 배지가 이미지에 구워져 있다(애니메이션 없음)
- [x] `public/guide/`에는 완성본만 들어간다(raw 없음)
**검증:**
- [x] 수동 확인: 메인 화면 완성본을 열어 네모 위치가 의도한 버튼과 맞는지 본다
**의존:** 작업 2
**예상 파일:** `guide/pages/frame.html`, `guide/pages/compose.mjs`, `guide/output/`, `public/guide/`
**규모:** S

#### 작업 4: `/guide` 페이지 골격
**설명:** `src/app/guide/page.tsx`(client) — `useAuthGate("session")` + `PublicGate`로 감싸고(`src/app/history/page.tsx`와 같은 패턴), 상단 제목·소개·바로가기, 절(section) 반복. `src/components/guide/`에 `GuideSection`(절 머리)·`GuideStep`(번호+글+이미지, 모바일 세로/`md` 좌우)·`GuideFaq`(details 접기)·`GuideWarning`(경고 상자). 메인으로 돌아가는 링크는 **모바일에서도 보이게**(history 페이지의 뒤로 링크는 `sm` 이상만 보임). 새 파일 상단 한국어 한 줄 주석.
**완료 기준:**
- [x] 1절 이미지 1장 이상으로 레이아웃이 모바일·PC 모두 맞다
- [x] 바로가기 클릭 시 해당 절로 스크롤
- [x] 게이트 통과 전에는 본문을 렌더하지 않는다
**검증:**
- [x] `npx tsc --noEmit`
- [x] 수동 확인: 390px·1280px에서 레이아웃
**의존:** 작업 3
**예상 파일:** `src/app/guide/page.tsx`, `src/components/guide/GuideSection.tsx`, `GuideStep.tsx`, `GuideFaq.tsx`, `GuideWarning.tsx`
**규모:** M

#### 작업 5: 진입 버튼
**설명:** `src/app/page.tsx` 헤더 actions의 `학생 관리` 링크 뒤에 테두리형 `사용 안내` 링크(`CircleHelp` 아이콘, `/members`의 `교사 현황` 클래스와 동일), `MobileNavMenu` items 맨 끝에 `{ key: "guide", label: "사용 안내", icon: CircleHelp, href: "/guide" }`.
**완료 기준:**
- [x] PC(`sm` 이상) 헤더와 모바일 메뉴 모두에서 `/guide`로 이동
- [x] 기존 버튼 줄바꿈·정렬이 깨지지 않음(640·768·1024px)
**검증:**
- [x] `npx tsc --noEmit`
- [x] 수동 확인: 세 폭에서 헤더 확인
**의존:** 작업 4
**예상 파일:** `src/app/page.tsx`
**규모:** XS

#### 작업 6: 1절 출석 체크하기 · 2절 출석 확인하기
**설명:** 장면 추가(세션 확인, 카드 누르기 전/후 도장, 다시 눌러 취소, 반 필터, 요약 숫자, 미출석 카드 대신 누르기, 지난 날짜 잠금 안내) + 본문. "카드는 오늘만", "다른 기기는 30초 뒤 반영", "PC에서는 헤더 버튼" 안내 포함.
**완료 기준:**
- [x] 시나리오 1·2를 가이드만 보고 따라 할 수 있다
- [x] 이미지 전부 더미
**검증:**
- [x] `npm run build`
- [x] 수동 확인: 시나리오 1·2 따라가기
**의존:** 작업 5
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 7: 3절 출석현황 · 4절 생일자
**설명:** 출석현황(날짜·기간 선택, 반별 차트, 행 눌러 명단 모달, 기간 모드 배지) + 생일자(진입, 세션, 이전/다음 달, 그룹별 명단, `(음력)` 표시) 장면과 본문.
**완료 기준:**
- [x] 시나리오 3·4를 가이드만 보고 따라 할 수 있다
**검증:**
- [x] 수동 확인: 시나리오 3·4 따라가기
**의존:** 작업 6
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 8: 5절 ① 들어가기 · 등록하기
**설명:** 관리자 비밀번호 창(가짜 입력), 헤더의 `학생`·`교사`·`새친구` 버튼(모바일 짧은 이름), 학생 등록 폼(필수 칸), 새친구 등록(학년 고정·반 비활성), 교사 등록(팀), 등록 후 메인에 카드 생김.
**완료 기준:**
- [x] 시나리오 5의 등록 부분을 따라 할 수 있다
- [x] 세 등록 버튼의 차이가 글과 이미지로 구분된다
**검증:**
- [x] 수동 확인: 시나리오 5(등록) 따라가기
**의존:** 작업 7
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 9: 5절 ② 고치기 · 지난 출석 · 지우기
**설명:** 정보 고치기(교사도 같은 방식, 새친구 → 학년·반 편입 팁), 폼의 지난 출석 수정, 지우기(경고 상자: 출석 기록 함께 삭제·되돌릴 수 없음, 확인 단계).
**완료 기준:**
- [x] 시나리오 2의 "지난주 기록 고치기"와 시나리오 5의 편입 부분을 따라 할 수 있다
- [x] 지우기 절에 경고 상자가 있다
**검증:**
- [x] 수동 확인: 해당 시나리오 따라가기
**의존:** 작업 8
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** M

#### 작업 10: 5-6 교사 현황 · 6절 자주 묻는 것
**설명:** 교사 현황(진입·세션/팀 탭·이름 검색·정렬·연락처 눌러 전화·출석률 읽는 법) 장면과 본문, FAQ(비밀번호 흔들림, 저장이 안 될 때, 다른 기기 반영 지연, 잘못 지웠을 때, 카드가 안 눌릴 때 등).
**완료 기준:**
- [x] 시나리오 6을 따라 할 수 있다
- [x] FAQ 5개 이상, 접고 펼쳐진다
**검증:**
- [x] 수동 확인: 시나리오 6 따라가기
**의존:** 작업 9
**예상 파일:** `guide/pages/shots.json`, `src/app/guide/page.tsx`, `public/guide/*`
**규모:** S

#### 작업 11: `guide/README.md`
**설명:** 폴더 역할, 촬영 서버 띄우는 명령(환경변수 비우기), `capture.mjs`·`compose.mjs` 실행 순서, 장면 추가 방법(`shots.json`), 안전장치 설명, "실데이터 화면 저장 금지".
**완료 기준:**
- [x] README만 보고 장면 하나를 다시 찍어 `public/guide/`까지 반영할 수 있다
**검증:**
- [x] 수동 확인: README 절차대로 장면 1개 재촬영
**의존:** 작업 10
**예상 파일:** `guide/README.md`
**규모:** XS

#### 작업 12: 프로젝트 문서 갱신
**설명:** `.claude/feature-workflow.md` PLAN 의무에 따른 작업. `CLAUDE.md` 화면 표(6→7)·폴더 구조(`guide/`, `src/app/guide`, `src/components/guide`, `public/guide`), `docs/migration-progress.md` 항목, `docs/context-notes.md` 맨 위에 판단 근거(fetch 가로채기 선택 이유, 만드는 곳/보여주는 곳 분리, 이미지 합성) + 목차.
**완료 기준:**
- [x] 세 문서가 실제 구조와 맞다
- [x] 문서에 실데이터·비밀값 없음
**검증:**
- [x] 수동 확인: 문서 diff 검토
**의존:** 작업 11
**예상 파일:** `CLAUDE.md`, `docs/migration-progress.md`, `docs/context-notes.md`
**규모:** S

#### 작업 13: 대상별 카드 + 접기
**설명:** 맨 위 소개 아래에 대상 카드 3장(학생용 → 1절 / 교사용 → 2·3·4절 / 총무팀용 → 5절)을 둔다. `GuideSection`을 접을 수 있게 바꿔(머리가 버튼, `aria-expanded`·`aria-controls`) 처음엔 접힌 상태로 시작한다. 5절의 `SubHeading`도 같은 방식으로 작은 주제를 접는다. 펼침 상태는 페이지가 한곳에서 관리하고(`Set<id>`), 카드·앵커가 그 상태를 바꾼다. 주소의 `#id`로 들어오거나 `hashchange`가 오면 그 절(작은 주제면 부모 절까지)을 펼친다. 접힌 내용은 렌더하지 않아 이미지도 늦게 받는다.
**완료 기준:**
- [x] 390px 첫 화면에 카드 3장 + 절 제목 6개가 보인다
- [x] 카드·절 머리·작은 주제를 열고 닫을 수 있고 `aria-expanded`가 맞게 바뀐다
- [x] `/guide#members-delete`로 들어오면 5절과 '지우기'가 펼쳐져 있다
**검증:**
- [x] `npx tsc --noEmit`
- [x] 수동 확인: 390·1280px에서 접기·펼치기, 앵커 진입
**의존:** 작업 12
**예상 파일:** `src/app/guide/page.tsx`, `src/components/guide/GuideSection.tsx`
**규모:** M

#### 작업 14: 상단 고정 내비 + 현재 절 강조 + 부드러운 스크롤
**설명:** `src/components/guide/GuideNav.tsx` 신규. 모바일(`lg` 미만)은 `sticky top-0` 가로 스크롤 칩 줄, `lg` 이상은 본문 왼쪽 `sticky` 목차(5절 작은 주제 포함). 현재 절은 `IntersectionObserver`로 판단해 강조(모바일은 강조 칩이 보이게 가로 스크롤도 맞춘다). 항목을 누르면 펼친 뒤 다음 프레임에 `scrollIntoView({ behavior })` — `prefers-reduced-motion`이면 `auto`. 절에는 고정 바 높이만큼 `scroll-margin-top`. 기존 상단 바로가기(`JUMPS`)는 대상 카드·고정 내비와 역할이 겹치므로 없앤다.
**완료 기준:**
- [x] 내비 항목을 누르면 접힌 절이 펼쳐지고 제목이 고정 바 바로 아래에 온다
- [x] 스크롤하면 현재 절이 강조된다
- [x] `prefers-reduced-motion`이면 바로 이동, 375px 가로 스크롤 없음
**검증:**
- [x] `npx tsc --noEmit`, `npm run build`
- [x] 수동 확인: 390·1024·1280px, 동작 줄이기 에뮬레이션
**의존:** 작업 13
**예상 파일:** `src/components/guide/GuideNav.tsx`, `src/app/guide/page.tsx`, `src/components/guide/GuideSection.tsx`
**규모:** M

## 위험과 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| init script가 Next 클라이언트의 첫 fetch보다 늦게 붙음 | 상 | 작업 1에서 가장 먼저 확인. 실패 시 `network route --body` 고정 응답 + 장면별 응답 교체로 후퇴(spec 원안) |
| 가로채기 누락으로 실시트에 요청 | 상 | `**/api/**` abort 안전망 + 촬영 서버 환경변수 비우기 + 서버 로그 0건 확인(체크포인트 A) |
| 환경변수 빈 값 덮어쓰기가 `.env.local`에 밀림 | 중 | 작업 2에서 실제 확인. 안 되면 촬영 전용 `--env-file`/임시 env 파일로 대체 |
| 이미지 용량(30장 안팎) | 중 | `next/image`로 표시, 장면 수가 많으면 합성 결과를 적정 해상도로 저장 |
| 화면이 바뀌면 캡처가 낡음 | 하 | `shots.json` + README로 재촬영 1명령화 |
| 날짜에 따라 장면이 달라짐(오늘만 체크 가능 등) | 하 | 날짜 의존 데이터를 촬영 시점 기준 생성 |
| 접힌 절 안의 앵커(작은 주제·FAQ)로 이동할 때 아직 렌더되지 않아 스크롤 대상이 없음 | 중 | 펼침 상태를 먼저 바꾸고 다음 프레임(`requestAnimationFrame`)에 스크롤 |
| 고정 내비가 모바일 화면 높이를 차지 | 하 | 칩 한 줄(약 48px)로 제한, 페이지 상단 소개 영역에서는 카드가 같은 역할 |

## 열린 질문
- 없음 (spec과 다른 점: 가짜 데이터 공급 방식 → "설계 결정" 첫 항목, 승인 시 함께 확정)
