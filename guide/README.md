# guide/ — 사용 안내 캡처 작업 폴더

`/guide` 페이지(`src/app/guide/page.tsx`)에 들어가는 휴대폰 캡처를 **가짜 데이터로** 만드는 곳이다.
이 폴더는 배포되지 않는다(앱 코드가 참조하지 않음). 사이트에 나가는 건 `public/guide/*.png` 완성본뿐이다.

> ⚠️ **실제 학생·교사 정보가 찍힌 화면은 어디에도 저장하지 않는다.** 이 저장소는 public이다.
> 아래 절차는 구글 시트에 **한 번도 접속하지 않고** 촬영하도록 짜여 있다.

## 폴더 구조

```
guide/
├── README.md          이 문서
├── mock/
│   ├── data.json      가짜 명단(학생·교사), 오늘 출석자(todayPresent)
│   └── intercept.js   촬영 브라우저의 fetch("/api/*")를 가로채 가짜 시트처럼 응답 + 시계를 최근 일요일 11:00으로 고정
├── capture/
│   ├── capture.mjs    shots.json대로 화면을 찍어 raw/<id>.png + 빨간 네모 좌표(raw/<id>.json) 저장
│   ├── raw/           원본 캡처 (git 제외)
│   └── tmp/           임시 파일 (git 제외)
├── pages/
│   ├── shots.json     촬영 목록 — 장면 id·시작 화면·찍기 전 동작·빨간 네모
│   ├── frame.html     휴대폰 틀 + 빨간 네모 합성용 HTML
│   └── compose.mjs    raw 캡처를 합성해 output/<id>.png로 굽고 public/guide/로 복사
└── output/            완성본 (public/guide/와 같은 파일)
```

## 준비물

- Node.js (프로젝트와 같은 버전)
- [agent-browser](https://www.npmjs.com/package/agent-browser): `npm i -g agent-browser` → `agent-browser install`(크롬 내려받기)

## 다시 찍는 순서

화면 디자인이 바뀌어 캡처가 낡았을 때 이 순서로 다시 만든다. 명령은 모두 **저장소 루트**에서 실행한다.

### 1. 촬영용 서버 띄우기 (다른 터미널에서, 끝날 때까지 켜 둔다)

구글 연결 설정 3개를 **무효값으로 덮어** 띄운다. 프로세스 환경변수가 `.env.local`보다 우선하므로, 이 서버는 시트에 접속할 수 없다.

Git Bash:
```bash
GOOGLE_SPREADSHEET_ID=disabled-for-guide-capture \
GOOGLE_SERVICE_ACCOUNT_EMAIL=disabled@guide.invalid \
GOOGLE_PRIVATE_KEY=disabled \
npx next dev -p 3100
```

PowerShell:
```powershell
$env:GOOGLE_SPREADSHEET_ID = "disabled-for-guide-capture"
$env:GOOGLE_SERVICE_ACCOUNT_EMAIL = "disabled@guide.invalid"
$env:GOOGLE_PRIVATE_KEY = "disabled"
npx next dev -p 3100
```

- 평소 개발 서버(`npm run dev`, 포트 3000)와 **따로** 띄운다. 포트를 바꾸면 `GUIDE_BASE=http://localhost:<포트>`로 알려 준다.
- 이 서버를 일반 브라우저로 열면 명단이 오류로 나온다. 정상이다 — 가짜 데이터는 촬영 브라우저 안에서만 보인다.

### 2. 촬영

```bash
node guide/capture/capture.mjs              # 전체
node guide/capture/capture.mjs 12-check-card 13-check-stamped   # 일부만
```

### 3. 합성 → public/guide/ 반영

```bash
node guide/pages/compose.mjs                # 전체
node guide/pages/compose.mjs 12-check-card  # 일부만
```

`guide/output/<id>.png`가 만들어지고 `public/guide/<id>.png`로 복사된다.

### 4. 확인

- 완성본을 열어 빨간 네모가 의도한 곳에 있는지 본다.
- 이름·연락처가 **가짜 데이터**(data.json에 있는 이름, `010-0000-0000`)인지 본다.
- 촬영용 서버 터미널에 `/api/...` 줄이 촬영 시작 시 점검 1줄(500) 외에는 없어야 한다.
- 끝나면 촬영용 서버를 끈다(Ctrl+C).

## 장면 추가·수정

1. `guide/pages/shots.json`에 장면을 추가한다.
2. `capture.mjs` → `compose.mjs`를 그 id로 실행한다.
3. `src/app/guide/page.tsx`에서 `<GuideStep shot="<id>" … />`로 넣는다.

### shots.json 필드

| 필드 | 뜻 |
|---|---|
| `id` | 파일 이름. 앞 숫자는 가이드 절 순서(1x 출석 체크, 2x 출석 확인, 3x 출석현황, 4x 생일자, 5x·6x·7x 학생 관리) |
| `url` | 시작 화면 경로 |
| `noAuth` | `true`면 비밀번호 창부터 시작(그 외에는 교사용·관리자 인증이 된 상태) |
| `clockDays` | 시계를 일요일에서 N일 뒤로(지난 예배 잠금 장면용). 데이터 기준일은 그대로 |
| `settle` | 화면을 연 뒤 기다릴 ms (기본 1500) |
| `after` | 동작을 마치고 찍기 전까지 기다릴 ms (기본 700) |
| `actions` | 찍기 전 동작 목록 — `click`·`fill`·`select`·`scrollTo`(+`block`)·`wait`·`open`·`eval` |
| `marks` | 빨간 네모를 그릴 요소 — `label`(①②…번호 배지), `soft`(점선) |

**요소 찾기** (`click`·`fill`·`select`·`scrollTo`·`marks`에 공통)

| 키 | 뜻 |
|---|---|
| `css` | CSS 선택자 |
| `text` | 글자가 정확히 같은 요소 |
| `contains` | 글자를 포함하는 요소 (가장 안쪽 것) |
| `tag` | `text`·`contains`의 후보를 이 선택자로 제한 (예: `"button"`, `"label"`) |
| `nth` | 여러 개일 때 몇 번째(0부터) |
| `up` | 찾은 요소에서 N단계 부모로 (네모를 감싸는 상자로 넓힐 때) |
| `self` | `true`면 버튼·링크 같은 조상으로 올라가지 않음 |

- 기본적으로 찾은 요소에서 가장 가까운 버튼·링크·label까지 올라간다.
- `fill`·`select`는 label을 주면 그 안의 입력칸을 쓴다(폼 칸은 label 글자로 찾으면 편하다).
- 글자로 찾을 때 **select의 선택지 글자도 포함**된다. 예: "반"으로 찾으면 "오전반" 선택지가 있는 소속 칸이 걸린다 → `{"css": "label", "nth": 3}`처럼 순서로 찾는다.

## 가짜 데이터

- `data.json`의 이름은 모두 지어낸 것, 연락처는 `010-0000-0000`, 주소·학교는 "예시"로 시작한다.
- `birthdate`의 `{M0}`은 촬영하는 달, `{M1}`은 다음 달로 바뀐다 → 언제 찍어도 "이번 달 생일자"가 있다.
- `todayPresent`는 촬영 일요일에 이미 출석한 사람. 장면이 매번 같게 나온다.
- 지난 주일 출석은 `rate`(출석 확률)로 매번 같은 결과가 나오게 만든다.
- 장면마다 가짜 상태를 처음부터 다시 시작한다(앞 장면의 등록·삭제가 섞이지 않음).

## 안전장치 (실시트에 닿지 않는 이유)

1. **가로채기** — 촬영 브라우저의 `/api/*` 요청은 `intercept.js`가 브라우저 안에서 처리한다. 서버로 나가지 않는다.
2. **차단** — 가로채기가 놓친 `/api/*` 요청은 `agent-browser network route --abort`가 서버에 닿기 전에 끊는다.
3. **서버 분리** — 촬영용 서버는 구글 설정이 무효값이라 요청이 와도 시트에 접속하지 못한다(500).
4. **사전 점검** — `capture.mjs`는 시작할 때 서버에 명단을 한 번 요청해 본다. 200(시트 연결됨)이면 촬영하지 않고 멈춘다.

## 문제 해결

| 증상 | 원인·해결 |
|---|---|
| `촬영 서버(...)에 연결할 수 없습니다` | 1단계 서버가 안 떠 있음 |
| `실제 스프레드시트에 연결돼 있습니다(응답 200)` | 평소 서버(`npm run dev`)에 붙었음 → 1단계 명령으로 띄운 서버 주소를 `GUIDE_BASE`로 |
| `요소를 찾지 못함: {...}` | 화면 문구·구조가 바뀜 → shots.json의 찾기 조건 수정 |
| `Could not configure browser` / 연결 거부 | 직전 브라우저 세션이 닫히는 중 — 스크립트가 자동으로 몇 번 재시도한다. 계속되면 `agent-browser --session guide close` 후 다시 |
| 잠깐 나왔다 사라지는 표시(예: "추가됨 ✓")가 안 찍힘 | 앱이 1.5초 뒤 원래대로 돌린다 → 해당 장면처럼 `eval`로 그 타이머만 막는다(`64-attend-added` 참고) |
| 캡처에 개발 표시(N 아이콘·개발도구 버튼)가 찍힘 | `intercept.js` 맨 아래 CSS에 선택자를 추가 |
