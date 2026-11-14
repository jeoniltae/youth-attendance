# 구현 계획: 사용 안내 항목 공유 · 캡처 스켈레톤

- spec: ./spec.md (`docs/plans/2026-11-12-guide-share/`)
- 상태: 진행 중

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
- [ ] `npm run test:e2e`, `npx tsc --noEmit` 통과
- [ ] 사용자 확인 후 다음으로 진행

### 2단계: 공유
- [ ] 작업 3: 절·작은 주제 공유 버튼
- [ ] 작업 4: 내비 이동 시 주소창 갱신

### 체크포인트: 2단계
- [ ] `npm run test:e2e` → `npx tsc --noEmit` → `npm run build` 통과
- [ ] 375px·1280px에서 머리 줄 확인, 시나리오 1~6을 dev 서버로 따라가기
- [ ] 사용자 확인 후 다음으로 진행

### 3단계: 문서
- [ ] 작업 5: 문서 갱신

### 체크포인트: 완료
- [ ] spec 성공 기준 모두 충족
- [ ] REVIEW 준비됨
- [ ] 남은 사람 확인: 실제 휴대폰에서 카톡 공유 시트·미리보기 카드(배포 후)

## 작업 상세

#### 작업 1: 캡처 스켈레톤

**설명:** `GuideStep`의 캡처를 628×1326 비율 상자로 감싸고, 받는 동안 상자에 `animate-pulse bg-ink/8`(기존 `Skeleton` 색)과 휴대폰 틀 모양 둥근 모서리를 깐다. 이미지는 `opacity-0`으로 시작해 `onLoad`에서 페이드인, 다 받으면 깜빡임을 끈다. `motion-reduce:`로 깜빡임·전환 제거. `onLoad` 때문에 파일 맨 위에 `"use client"`. 상자에 `data-loading` 속성을 둬 테스트가 상태를 읽는다.

**완료 기준:**
- [x] 캡처 응답을 늦추면 스켈레톤이 보이고, 응답이 오면 `data-loading`이 사라지고 이미지가 보인다
- [x] 절을 접었다 다시 펼쳐도(캐시) 스켈레톤이 남지 않는다
- [x] 로딩 전후 단계(li) 높이가 같다

**검증:**
- [ ] `npm run test:e2e` — guide.spec.ts: `page.route("**/_next/image**")`로 응답을 붙잡아 스켈레톤 확인 → 풀어 준 뒤 사라짐·높이 비교 / 접었다 펼친 뒤 스켈레톤 없음
- [ ] 수동 확인: dev 서버 + 개발자 도구 네트워크 제한으로 학생 관리 > 등록하기 펼치기

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
- [ ] `npm run test:e2e` — guide.spec.ts: `request.get("/guide")`·`request.get("/")` HTML의 meta 비교
- [ ] 수동 확인: `npm run build` 후 출력 HTML 확인(작업 4 체크포인트에서)

**의존:** 없음

**예상 파일:**
- `src/app/guide/layout.tsx` (새 파일)
- `tests/e2e/guide.spec.ts`

**규모:** XS

#### 작업 3: 절·작은 주제 공유 버튼

**설명:** `src/components/guide/GuideShareButton.tsx`(새 파일, 상단 한국어 주석) — props `id`, `label`(문구 첫 줄 뒤쪽). 누르면 문구 `고등부 출석부 사용 안내 — ${label}\n교사 비밀번호가 필요해요\n${location.origin}/guide#${id}`를 만들어 `navigator.share`가 있으면 `share({ text })`(AbortError 무시, 그 밖의 실패는 복사로 넘김), 없으면 `clipboard.writeText` → Check 아이콘 + 버튼 위 "링크 복사됨" 2초(실패면 "복사하지 못했어요"). 44px 원형, 링크 아이콘, aria-label `${label} 링크 공유`. `GuideSection`은 머리를 flex 줄로 바꾸고 공유 버튼을 펼침 버튼 옆에 두며 자기 title을 컨텍스트로 내려준다. `GuideSubSection`은 `절 제목 · 주제 제목`으로 버튼을 단다.

**완료 기준:**
- [ ] 절 7개·작은 주제 7개 머리에 공유 버튼이 있고(접힌 상태 포함), 눌러도 펼침 상태가 바뀌지 않는다
- [ ] 공유 시트 없는 환경: 클립보드에 세 줄 문구, "링크 복사됨"이 보였다 2초 뒤 사라진다 / 공유 시트 있는 환경: `share`가 같은 문구로 불리고 취소(AbortError) 시 오류 문구가 없다
- [ ] 375px에서 머리 줄 가로 넘침 없음

**검증:**
- [ ] `npm run test:e2e` — guide.spec.ts: 버튼 개수 14, 펼침 `aria-expanded` 불변, clipboard 권한 부여 후 내용 비교·문구 사라짐, 가짜 share 인자 확인·AbortError 시 오류 문구 없음, 375px `scrollWidth <= clientWidth`
- [ ] 수동 확인: dev 서버 375px·1280px에서 머리 줄 모양

**의존:** 없음 (작업 1·2와 독립)

**예상 파일:**
- `src/components/guide/GuideShareButton.tsx` (새 파일)
- `src/components/guide/GuideSection.tsx`
- `tests/e2e/guide.spec.ts`

**규모:** M

#### 작업 4: 내비 이동 시 주소창 갱신

**설명:** `src/app/guide/page.tsx`의 `goTo`에서 `history.replaceState(null, "", \`#${id}\`)`. 기존 hash 진입 효과(`fromHash`)는 그대로.

**완료 기준:**
- [ ] 칩·목차·대상 카드로 이동하면 주소가 `/guide#<id>`가 되고 `history.length`는 그대로다
- [ ] `/guide#members-delete`로 진입·인증 통과 시 학생 관리·지우기가 펼쳐진다(기존 동작)

**검증:**
- [ ] `npm run test:e2e` — guide.spec.ts: 칩 클릭 후 URL·history.length, 해시 진입 후 `aria-expanded=true`
- [ ] 수동 확인: dev 서버에서 칩 이동 후 주소창 복사 → 새 탭 붙여넣기

**의존:** 없음

**예상 파일:**
- `src/app/guide/page.tsx`
- `tests/e2e/guide.spec.ts`

**규모:** XS

#### 작업 5: 문서 갱신

**설명:** `CLAUDE.md` 폴더 구조(`guide/layout.tsx`, `GuideShareButton.tsx`, GuideStep 스켈레톤, `tests/e2e/guide.spec.ts`)·`/guide` 화면 설명(공유 버튼·주소 갱신·미리보기). `docs/migration-progress.md` 완료 항목, `docs/context-notes.md` 맨 위 날짜 섹션 + 목차("항목별 카드는 불가 → 공통 카드 + 공유 문구 첫 줄", "share는 text 하나로", "openGraph 얕은 병합"). plan.md 체크 갱신.

**완료 기준:**
- [ ] 세 문서에 이번 변경이 반영되고 서로 어긋나는 설명이 없다

**검증:**
- [ ] 수동 확인: 문서 diff 읽기, 실제 값(주소·토큰·비밀번호) 없음 확인

**의존:** 작업 1~4

**예상 파일:**
- `CLAUDE.md`, `docs/migration-progress.md`, `docs/context-notes.md`

**규모:** S

## 위험과 대응
| 위험 | 영향 | 대응 |
|------|------|------|
| Chromium 테스트 브라우저에 `navigator.share`가 있어 복사 경로가 안 탄다 | 중 | init script로 share를 지우거나 가짜로 바꿔 경로를 고정 |
| 앱별로 `share({ text })` 처리 차이(카톡이 링크 카드를 안 만들 수 있음) | 중 | 링크를 마지막 줄에 둠. 실제 휴대폰 확인을 "남은 사람 확인"으로 남김. 문제면 `url` 추가로 전환 |
| 카톡 미리보기 캐시로 배포 후에도 예전 카드 | 하 | 코드와 무관 — 필요 시 카카오 공유 디버거에서 캐시 삭제(문서에 한 줄) |
| `_next/image` 경로를 route로 붙잡는 방식이 dev 서버에서 다르게 동작 | 하 | 안 되면 `/guide/*.png` 원본 경로도 함께 가로챔 |

## 열린 질문
없음
