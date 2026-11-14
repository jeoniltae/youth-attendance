# 구현 계획: 사용 안내 항목 공유 · 캡처 스켈레톤

- spec: ./spec.md (`docs/plans/2026-11-12-guide-share/`)
- 상태: 완료 (2026-11-14 4단계 — 사용자 결정으로 리뷰 스킬·deploy-gate 생략, tsc·E2E·build 통과)

## 개요
사용 안내(`/guide`)의 각 절·작은 주제에 공유 버튼을 달고(휴대폰 공유 시트 / PC 복사), 내비 이동 시 주소창 `#`를 갱신하고, `/guide` 전용 카톡 미리보기 제목·설명을 넣고, 캡처를 받는 동안 휴대폰 모양 스켈레톤을 보여 준다. API·시트·환경변수 변경 없음, 게이트는 session 그대로.

## 설계 결정
- **미리보기는 `src/app/guide/layout.tsx`(서버)에** — page.tsx가 `"use client"`라 metadata를 내보낼 수 없다. Next metadata는 **얕게 합쳐져** `openGraph`를 쓰면 루트 값이 통째로 바뀐다 → `images`(`/og-img.png` 992×517)·`siteName`·`locale`·`type`을 다시 적는다 (`node_modules/next/dist/docs/.../generate-metadata.md` "Merging")
- **캐시된 캡처의 onLoad 누락은 걱정 없음** — `next/image`가 마운트 시 `img.complete`면 onLoad를 직접 부른다(`node_modules/next/dist/client/image-component.js:155`). 그래도 E2E로 확인한다
- **공유는 `navigator.share({ text })` 하나로** — 세 줄 문구에 링크가 이미 들어 있다. `url`을 따로 넘기면 앱에 따라 링크가 두 번 붙는다. 클립보드도 같은 문구
- **절 제목은 컨텍스트로 전달** — 작은 주제 문구에 `절 제목 · 주제 제목`이 필요하다. `GuideSection`이 자기 `title`을 작은 컨텍스트로 내려 주고 `GuideSubSection`이 읽는다(page.tsx 호출부 변경 없음)
- **공유 버튼은 펼침 버튼의 형제** — 머리를 `flex` 줄로 바꿔 `h2/h3(펼침 버튼) + 공유 버튼`. 눌러도 펼침에 영향 없음
- **"링크 복사됨"은 버튼 위에 absolute로 띄운다** — 버튼 안 글자로 넣으면 375px에서 제목이 밀린다. 아이콘은 Link → Check로 2초 바꾸고, 화면 읽기용 `aria-live` 문구를 둔다(시상 명단 복사 `NotesSummaryList.tsx`의 COPIED_MS 2000·Check 아이콘 패턴 재사용)
- **주소 갱신은 `goTo`에서만** — 내비·대상 카드·해시 진입이 모두 goTo를 거친다. 머리 버튼으로 펼치고 접을 때는 바꾸지 않는다(spec 범위). `history.replaceState(null, "", "#" + id)`는 hashchange를 일으키지 않아 기존 앵커 처리와 겹치지 않는다
- **캡처 재촬영 없음** — `guide/pages/shots.json`에 `/guide` 화면 촬영이 없다(앱 화면만 찍음)
- **E2E는 `tests/e2e/guide.spec.ts` 하나에 작업마다 추가** — `/guide`는 API 호출이 없어 `session_token` init script만 있으면 된다(`gates.spec.ts` 방식). 공유 경로는 init script로 `navigator.share`를 지우거나(복사 경로) 가짜로 바꿔(공유·취소 경로) 고정한다

## 작업 목록

### 1단계: 위험한 것 먼저
- [x] 작업 1: 캡처 스켈레톤
- [x] 작업 2: `/guide` 카톡 미리보기

### 체크포인트: 1단계
- [x] `npm run test:e2e`, `npx tsc --noEmit` 통과
- [x] 사용자 확인 후 다음으로 진행

### 2단계: 공유
- [x] 작업 3: 절·작은 주제 공유 버튼
- [x] 작업 4: 내비 이동 시 주소창 갱신

### 체크포인트: 2단계
- [x] `npm run test:e2e` → `npx tsc --noEmit` → `npm run build` 통과
- [x] 375px·1280px에서 머리 줄 확인, 시나리오 1~6 확인 — dev 서버 대신 E2E·임시 E2E로 따라감(verify.md). 시나리오 1·2의 실기기 부분은 아래 남은 사람 확인
- [x] 사용자 확인 후 다음으로 진행

### 3단계: 문서
- [x] 작업 5: 문서 갱신

### 체크포인트: 완료
- [x] spec 성공 기준 모두 충족
- [x] REVIEW 준비됨
- [x] 남은 사람 확인: 실제 휴대폰에서 카톡 공유 시트·미리보기 카드(배포 후) — 2026-11-14 사용자 확인(카드 표시됨, 문구가 단조롭고 1·2줄이 붙어 보임 → 4단계)

### 4단계: 후속 변경 — 공유 문구 다듬기 (2026-11-14 추가)
- **이전 완료:** 1~3단계는 2026-11-14 SHIP 판정 GO로 상태 `완료`(커밋 `bcdb51f`까지). 4단계를 추가하며 상태를 `진행 중`으로 되돌렸다
- **4단계 리뷰 범위:** `bcdb51f` 이후 변경
- **설계:** spec "후속 변경 1"(사용자 선택 아이디어 2) — 📖 머리말 / ✅ 제목 / 절 설명 / 빈 줄 / 🔒 비밀번호 안내 / 👉 링크
- **검증 범위(사용자 결정 2026-11-14):** 구현 → tsc·test:e2e·build → 문서 → 커밋 초안을 한 번에. code-review·security-review 스킬과 deploy-gate는 건너뛴다(문구만 바뀌는 작은 변경). 결과는 체크포인트 G에 기록
- [x] 작업 6: 공유 문구 다듬기
- [x] 작업 7: 문서 갱신

### 체크포인트 G: 공유 문구
- [x] `npx tsc --noEmit` 0 → `npm run test:e2e` 26개 통과 → `npm run build` 0 (문구 비교 테스트 2개를 새 문구로 고친 뒤, 2026-11-14)
- [x] 바뀐 줄에 비밀값·개인정보 없음(문구는 화면에 이미 보이는 공개 안내 문장뿐)
- [ ] 남은 사람 확인: 배포 후 실제 휴대폰 카톡 말풍선에서 줄 구분이 읽기 좋게 보임

## 작업 상세

#### 작업 1: 캡처 스켈레톤

**설명:** `GuideStep`의 캡처를 628×1326 비율 상자로 감싸고, 받는 동안 상자에 `animate-pulse bg-ink/8`(기존 `Skeleton` 색)과 휴대폰 틀 모양 둥근 모서리를 깐다. 이미지는 `opacity-0`으로 시작해 `onLoad`에서 페이드인, 다 받으면 깜빡임을 끈다. `motion-reduce:`로 깜빡임·전환 제거. `onLoad` 때문에 파일 맨 위에 `"use client"`. 상자에 `data-loading` 속성을 둬 테스트가 상태를 읽는다.

**완료 기준:**
- [x] 캡처 응답을 늦추면 스켈레톤이 보이고, 응답이 오면 `data-loading`이 사라지고 이미지가 보인다
- [x] 절을 접었다 다시 펼쳐도(캐시) 스켈레톤이 남지 않는다
- [x] 로딩 전후 단계(li) 높이가 같다

**검증:**
- [x] `npm run test:e2e` — guide.spec.ts: `page.route("**/_next/image**")`로 응답을 붙잡아 스켈레톤 확인 → 풀어 준 뒤 사라짐·높이 비교 / 접었다 펼친 뒤 스켈레톤 없음
- [x] 수동 확인: dev 서버 + 개발자 도구 네트워크 제한으로 학생 관리 > 등록하기 펼치기 — 대신 E2E에서 `_next/image` 응답을 붙잡아 확인(들어가기 주제)

**의존:** 없음

**예상 파일:**
- `src/components/guide/GuideStep.tsx`
- `tests/e2e/guide.spec.ts` (새 파일)

**규모:** S

#### 작업 2: `/guide` 카톡 미리보기

**설명:** 서버 컴포넌트 `src/app/guide/layout.tsx`에 metadata — title "고등부 출석부 사용 안내", description "출석 체크부터 학생 관리까지 휴대폰 화면으로 안내해요", openGraph(title·description·url `/guide`·siteName·images `/og-img.png` 992×517·locale `ko_KR`·type `website`). layout은 children만 그대로 돌려준다.

**완료 기준:**
- [x] `/guide` HTML의 `og:title`·`og:description`·`og:url`(…/guide)·`og:image`가 사용 안내 값이다
- [x] `/` HTML의 미리보기는 기존 값 그대로다

**검증:**
- [x] `npm run test:e2e` — guide.spec.ts: `request.get("/guide")`·`request.get("/")` HTML의 meta 비교
- [x] 수동 확인: `npm run build` 후 출력 HTML 확인 — `.next/server/app/guide.html`의 og 4개·title 확인

**의존:** 없음

**예상 파일:**
- `src/app/guide/layout.tsx` (새 파일)
- `tests/e2e/guide.spec.ts`

**규모:** XS

#### 작업 3: 절·작은 주제 공유 버튼

**설명:** `src/components/guide/GuideShareButton.tsx`(새 파일, 상단 한국어 주석) — props `id`, `label`(문구 첫 줄 뒤쪽). 누르면 문구 `고등부 출석부 사용 안내 — ${label}\n교사 비밀번호가 필요해요\n${location.origin}/guide#${id}`를 만들어 `navigator.share`가 있으면 `share({ text })`(AbortError 무시, 그 밖의 실패는 복사로 넘김), 없으면 `clipboard.writeText` → Check 아이콘 + 버튼 위 "링크 복사됨" 2초(실패면 "복사하지 못했어요"). 44px 원형, 링크 아이콘, aria-label `${label} 링크 공유`. `GuideSection`은 머리를 flex 줄로 바꾸고 공유 버튼을 펼침 버튼 옆에 두며 자기 title을 컨텍스트로 내려준다. `GuideSubSection`은 `절 제목 · 주제 제목`으로 버튼을 단다.

**완료 기준:**
- [x] 절 7개·작은 주제 7개 머리에 공유 버튼이 있고(접힌 상태 포함), 눌러도 펼침 상태가 바뀌지 않는다
- [x] 공유 시트 없는 환경: 클립보드에 세 줄 문구, "링크 복사됨"이 보였다 2초 뒤 사라진다 / 공유 시트 있는 환경: `share`가 같은 문구로 불리고 취소(AbortError) 시 오류 문구가 없다
- [x] 375px에서 머리 줄 가로 넘침 없음

**검증:**
- [x] `npm run test:e2e` — guide.spec.ts: 버튼 개수 14, 펼침 `aria-expanded` 불변, clipboard 권한 부여 후 내용 비교·문구 사라짐, 가짜 share 인자 확인·AbortError 시 오류 문구 없음, 375px `scrollWidth <= clientWidth`
- [x] 수동 확인: dev 서버 375px·1280px에서 머리 줄 모양

**의존:** 없음 (작업 1·2와 독립)

**예상 파일:**
- `src/components/guide/GuideShareButton.tsx` (새 파일)
- `src/components/guide/GuideSection.tsx`
- `tests/e2e/guide.spec.ts`

**규모:** M

#### 작업 4: 내비 이동 시 주소창 갱신

**설명:** `src/app/guide/page.tsx`의 `goTo`에서 `history.replaceState(null, "", \`#${id}\`)`. 기존 hash 진입 효과(`fromHash`)는 그대로.

**완료 기준:**
- [x] 칩·목차·대상 카드로 이동하면 주소가 `/guide#<id>`가 되고 `history.length`는 그대로다
- [x] `/guide#members-delete`로 진입·인증 통과 시 학생 관리·지우기가 펼쳐진다(기존 동작)

**검증:**
- [x] `npm run test:e2e` — guide.spec.ts: 칩 클릭 후 URL·history.length, 해시 진입 후 `aria-expanded=true`
- [x] 수동 확인: dev 서버에서 칩 이동 후 주소창 복사 → 새 탭 붙여넣기 — 대신 PC 목차·대상 카드 E2E + 해시 진입·비밀번호 통과(임시 E2E)로 확인

**의존:** 없음

**예상 파일:**
- `src/app/guide/page.tsx`
- `tests/e2e/guide.spec.ts`

**규모:** XS

#### 작업 5: 문서 갱신

**설명:** `CLAUDE.md` 폴더 구조(`guide/layout.tsx`, `GuideShareButton.tsx`, GuideStep 스켈레톤, `tests/e2e/guide.spec.ts`)·`/guide` 화면 설명(공유 버튼·주소 갱신·미리보기). `docs/migration-progress.md` 완료 항목, `docs/context-notes.md` 맨 위 날짜 섹션 + 목차("항목별 카드는 불가 → 공통 카드 + 공유 문구 첫 줄", "share는 text 하나로", "openGraph 얕은 병합"). plan.md 체크 갱신.

**완료 기준:**
- [x] 세 문서에 이번 변경이 반영되고 서로 어긋나는 설명이 없다

**검증:**
- [x] 수동 확인: 문서 diff 읽기, 실제 값(주소·토큰·비밀번호) 없음 확인

**의존:** 작업 1~4

**예상 파일:**
- `CLAUDE.md`, `docs/migration-progress.md`, `docs/context-notes.md`

**규모:** S

#### 작업 6: 공유 문구 다듬기

**설명:** `GuideShareButton`에 선택 prop `description`을 더하고 문구를 spec "후속 변경 1" 형식으로 만든다. `GuideSection`은 자기 `description`을 넘기고, `GuideSubSection`은 넘기지 않는다(사용자 결정 — 부모 설명을 대신 넣지 않음). 공유 시트·클립보드는 같은 문구, `share({ text })`만 넘기는 방식은 그대로.

**완료 기준:**
- [x] 절(설명 있음): 📖 머리말 · ✅ 제목 · 설명 · 빈 줄 · 🔒 · 👉 링크
- [x] 작은 주제: 설명 줄 없이 같은 형식
- [x] 공유 시트와 클립보드 문구가 같다

**검증:**
- [x] `npm run test:e2e` — guide.spec.ts 문구 비교 2곳 갱신: 복사(학생 관리 · 지우기 → 설명 없음), 공유 시트(출석현황 보기 → 설명 있음)
- [x] `npx tsc --noEmit`, `npm run build`

**의존:** 없음

**예상 파일:**
- `src/components/guide/GuideShareButton.tsx`
- `src/components/guide/GuideSection.tsx`
- `tests/e2e/guide.spec.ts`

**규모:** S

#### 작업 7: 문서 갱신

**설명:** `CLAUDE.md`의 GuideShareButton 설명(세 줄 → 새 형식), `docs/context-notes.md` "공유는 text 하나로" 섹션에 문구 형식과 이유(줄바꿈 하나가 공백으로 바뀌어 보임 → 이모지·빈 줄로 경계 표시), `docs/migration-progress.md` 항목 추가.

**완료 기준:**
- [x] 세 문서가 새 문구 형식과 어긋나지 않는다

**검증:**
- [x] 수동 확인: 문서 diff 읽기

**의존:** 작업 6

**예상 파일:**
- `CLAUDE.md`, `docs/context-notes.md`, `docs/migration-progress.md`

**규모:** XS

## 위험과 대응
| 위험 | 영향 | 대응 |
|------|------|------|
| Chromium 테스트 브라우저에 `navigator.share`가 있어 복사 경로가 안 탄다 | 중 | init script로 share를 지우거나 가짜로 바꿔 경로를 고정 |
| 앱별로 `share({ text })` 처리 차이(카톡이 링크 카드를 안 만들 수 있음) | 중 | 링크를 마지막 줄에 둠. 실제 휴대폰 확인을 "남은 사람 확인"으로 남김. 문제면 `url` 추가로 전환 |
| 카톡 미리보기 캐시로 배포 후에도 예전 카드 | 하 | 코드와 무관 — 필요 시 카카오 공유 디버거에서 캐시 삭제(문서에 한 줄) |
| `_next/image` 경로를 route로 붙잡는 방식이 dev 서버에서 다르게 동작 | 하 | 안 되면 `/guide/*.png` 원본 경로도 함께 가로챔 |

## 열린 질문
없음

## 리뷰 결과 (2026-11-14, 범위 `c3b0dcf..640b09c`)

- code-review(medium) 9건 → 3건 수정, 6건 수용 / security-review는 스킬 실행 실패(`origin/HEAD` 없음)로 직접 점검 — 새 API·HTML 삽입 없음, 공유 문구·`#id`는 고정 값만, 보안 체크리스트 "매 커밋 전 확인" 4항목 이상 없음
- 수정
  - [x] 1 (중) 캡처를 못 받으면 스켈레톤이 영원히 깜빡이고 alt도 안 보임 → `GuideStep`에 `onError`로 스켈레톤 끔
  - [x] 2 (하~중) "링크 복사됨"이 머리가 칩 줄 바로 아래일 때 칩 줄(z-20) 뒤로 가려짐 → 버튼 왼쪽 세로 가운데로 이동
  - [x] 3 (하) 머리 버튼으로 펼치면 주소가 예전 `#`로 남음 → 펼칠 때도 `replaceState`(접을 때는 그대로). spec 설계("goTo에서만")를 사용자 결정으로 확장
- 수용: 공유 시트 권한 실패 뒤 복사도 실패(드묾) · 미리보기 주소에서 공유하면 열 수 없는 링크(교사는 운영 주소만 사용) · 같은 `#` 재탭 시 다시 펼쳐지지 않음(브라우저 기본) · OG 값 루트에서 수동 복사(layout은 추가 export 불가, 주석으로 연결) · 복사 표시 로직 중복(15줄) · 같은 문구 연속 시 화면 읽기 재안내 누락 가능
- 검증: 새 E2E 3개를 수정 전 코드로 돌려 3개 모두 실패 → 수정 후 통과 확인. 복사 표시 테스트는 칩으로 이동하면 `scroll-mt` 여백 때문에 재현되지 않아, 아래 절을 펼쳐 페이지를 길게 만든 뒤 직접 스크롤해 재현. 재검증 `npx tsc --noEmit` 0 · `npm run test:e2e` 26개 통과 · `npm run build` 0
