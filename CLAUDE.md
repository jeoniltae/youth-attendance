# 고등부 전자출석부 — 프로젝트 컨텍스트

## 관련 문서

작업 전에 아래 문서를 반드시 확인하세요.

- 코딩 규칙 및 금지 사항: `docs/coding-guidelines.md`
- 작업 결정 기록 (왜 그렇게 했는지): `docs/context-notes.md`
- 마이그레이션 진행 상태 (무엇을 어떤 순서로 했는지): `docs/migration-progress.md`
  - 새 기능을 완료하면 이 문서에 항목을 추가하고, 판단 근거는 `context-notes.md`에 남깁니다.
- 보안 체크리스트 (커밋 전 필수 확인): `docs/security-checklist.md`
- 기존 GAS 원본 코드 (마이그레이션 참고용, git 추적 제외): `docs/legacy-gas.json`
  - 이 프로젝트의 시트 구조, 비즈니스 로직, API 설계는 이미 본 문서 아래 섹션에 정리되어 있습니다.
  - 원본 파일은 구체적인 구현 디테일(예: 특정 함수의 정렬 로직, 엣지 케이스 처리)이 불분명할 때만 참고하세요.
  - **이 파일은 실제 학생 개인정보(이름, 연락처, 주소)를 포함하므로 `.gitignore`에 등록되어 있습니다. 코드나 커밋에 실제 값을 그대로 옮기지 마세요.**

## 보안 주의사항

이 저장소는 **public**으로 운영됩니다. 다음 항목은 절대 커밋하지 않습니다.

- 실제 스프레드시트 ID, Service Account 키, 관리자 비밀번호 → `.env.local`에만 작성
- 실제 학생/교사 개인정보(이름, 전화번호, 주소, 생년월일) → 코드, 주석, 테스트 데이터 어디에도 사용하지 않고 더미 데이터(`홍길동`, `010-0000-0000` 등)로 대체
- 커밋 전에는 `docs/security-checklist.md`를 기준으로 확인합니다.

---

## 프로젝트 개요

교회 고등부 출석 및 교적 관리 시스템을 Google Apps Script(GAS)에서 Next.js로 마이그레이션하는 프로젝트입니다.
기존 GAS 웹앱의 화면 기능과 디자인을 최대한 유지하면서, React 기반의 현대적인 구조로 재구성합니다.

## 기술 스택

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Server State**: @tanstack/react-query (polling 30초 간격 + Optimistic Update)
- **API**: Next.js Route Handlers (`src/app/api/`)
- **Database**: Google Sheets API v4 (Service Account 인증)
- **Deploy**: Vercel

## 핵심 설계 결정

### Google Sheets 연동 방식
Netlify Functions 대신 Vercel을 선택한 이유는 크레딧 기반 과금이 아닌 리소스 기반 과금 방식이라
이 프로젝트의 사용 패턴(월 4회, 6시간, 20명 동시 접속)에서 무료 플랜으로 충분히 운영 가능하기 때문입니다.
Next.js Route Handlers가 서버 사이드에서 Google Sheets API를 호출하므로 Service Account 키가 브라우저에 노출되지 않습니다.

### 실시간 동기화 전략
Google Sheets는 WebSocket을 지원하지 않으므로 Polling 방식을 사용합니다.
- **Polling 간격**: 30초 (다른 사람의 변경사항을 감지)
- **Optimistic Update**: 내 클릭은 즉시 UI에 반영, 서버 저장은 백그라운드 처리
- 출석 버튼 클릭 → UI 즉시 반영(0ms) → 서버 저장(~300ms) → 실패 시 롤백

### 인증 구조
비밀번호 게이트를 두 단계로 분리합니다. 레거시 GAS는 구글 계정 관리자 승인이 있어야
출석부 화면 자체를 볼 수 있었는데, 새 앱도 동일한 수준으로 공개 화면을 보호합니다.

- **교사용 게이트**(`session` role): `/`(출석체크)·`/history`(출석 현황)·`/birthday`(생일자)·
  `/registry`(교적부) 공개 4화면 진입 시 `PublicGate` 컴포넌트가 비밀번호를 요구합니다. 여러
  교사가 공유해서 아는 비밀번호(`SESSION_PASSWORD`)이며, 통과하면 `sessionStorage`에
  `session_token`을 저장(한 번 통과하면 4화면 공통).
- **관리자용 게이트**(`admin` role): `/members`(학생·교사 데이터 수정)·`/teachers`(교사 명단
  열람) 진입 시 별도 비밀번호(`ADMIN_PASSWORD`)를 요구합니다. `admin_token`으로 별도 저장되어
  교사용 인증과 섞이지 않습니다.
- 두 게이트 모두 `POST /api/auth { password, role }`로 검증하고, `useAuthGate(role)` 훅 +
  `AuthGateModal` 컴포넌트를 공유합니다 (`src/hooks/useAuthGate.ts`,
  `src/components/common/AuthGateModal.tsx`, `src/components/common/PublicGate.tsx`).
- **보호 수준은 화면(UI) 레벨입니다.** 데이터 API(`/api/students` 등)에는 서버사이드
  인증 체크가 없어 URL을 알면 직접 호출은 가능합니다 — "외부인이 화면 URL로 못 들어오게"가
  목표이며, API 자체를 잠그는 건 별도 작업 범위입니다.

## 스프레드시트 DB 구조

스프레드시트 ID는 `.env.local`의 `GOOGLE_SPREADSHEET_ID`로 관리합니다. (저장소에는 값을 커밋하지 않음)

### Students 시트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| ID | string | `2025-1-2-001` 형식 (연도-학년-반-순번) |
| Session | string | `오전` \| `오후` |
| Grade | string | 1, 2, 3 (학년) |
| Class | string | 반 번호 |
| Name | string | 학생 이름 |
| Phone | string | 학생 연락처 |
| ParentPhone | string | 부모 연락처 |
| Address | string | 주소 |
| Birthdate | string | 생년월일 (YYYY-MM-DD) |
| School | string | 학교명 |
| Teacher | string | 담당 교사 |
| Notes | string | 비고 |
| 출석률 | string | 출석률(%) — 실제 운영 시트 헤더가 한글, 컬럼명 그대로 표기 |
| 세례 | string | 세례 여부/구분 — 실제 운영 시트 헤더가 한글, 컬럼명 그대로 표기 |
| gender | string | `남` \| `여` — 실제 운영 시트 헤더가 영문 소문자, 컬럼명 그대로 표기 |

### Teachers 시트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| ID | string | 교사 ID |
| Session | string | `오전` \| `오후` |
| Team | string | `총무팀` \| `예배지원팀` \| `1학년교사` \| `2학년교사` \| `3학년교사` \| `새친구반` |
| Name | string | 교사 이름 |
| Phone | string | 연락처 |
| Address | string | 주소 |
| Birthdate | string | 생년월일 (YYYY-MM-DD) |
| Notes | string | 비고 |
| Lunar | string | `TRUE` \| `FALSE` — Birthdate가 음력 날짜인지 여부. 실시트에는 없어 Phase 8-B 전환 시 추가 필요 (Attendance의 `Type` 컬럼과 동일 패턴, `scripts/add-teacher-lunar-header.mjs`로 추가) |

### Attendance 시트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| Date | string | `YYYY-MM-DD` |
| Session | string | `오전` \| `오후` |
| Grade | string | 학년 |
| Class | string | 반 |
| StudentID | string | Students.ID 참조 |
| Name | string | 이름 |
| Status | string | `출석` (고정값, 레코드 없으면 결석으로 간주) |
| Timestamp | string | 변경 시각 |
| ect | string | 기타 비고(자유 텍스트, 예: `타교회 선교(OO목사님 확인)`) — `student`/`teacher` 구분과 무관한 별개 컬럼. 실제 운영 시트 헤더가 소문자 `ect` (코드는 이 컬럼을 이름으로 읽지 않으므로 영향 없음) |
| Type | string | `student` \| `teacher` — 실제 운영 시트에는 존재하지 않아 Phase 3에서 신규 추가할 컬럼 |

### 출석 상태 처리 규칙
- Attendance 시트에 해당 날짜 + StudentID 레코드가 **존재하면** → 출석
- 레코드가 **없으면** → 결석 (별도 저장 없음)
- 출석 처리: Attendance 시트에 행 추가
- 결석 처리(출석 취소): 해당 행 삭제

## TypeScript 타입 정의

```typescript
type Session = '오전' | '오후';
type MemberType = 'student' | 'teacher';

interface Student {
  id: string;           // "2025-1-2-001"
  session: Session;
  grade: string;
  class: string;
  name: string;
  phone: string;
  parentPhone: string;
  address: string;
  birthdate: string;
  school: string;
  teacher: string;
  notes: string;
  attendanceRate: string;
  baptism: string;
  gender: string;
}

interface Teacher {
  id: string;
  session: Session;
  team: string;
  name: string;
  phone: string;
  address: string;
  birthdate: string;
  notes: string;
  lunarBirthdate: boolean; // true면 birthdate가 음력 — 생일자 조회 시 해당 연도 양력으로 환산
}

interface AttendanceRecord {
  date: string;
  session: Session;
  grade: string;
  class: string;
  studentId: string;
  name: string;
  status: '출석';
  timestamp: string;
  note: string;
  type: MemberType;
}
```

## 화면 구성 (6개 페이지)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 출석체크 메인 (카드 UI, 세션 필터, 요약 통계) |
| `/history` | `app/history/page.tsx` | 출석 현황 (학년/반/팀별 그룹핑). **기준일 + 기간 길이**로 1주(기본) 또는 여러 주를 조회 — 기간 모드에서는 주당 평균 인원으로 집계하고 주차별 추이 차트·개근/부분 출석/결석 배지가 추가됨. 차트의 각 행과 배지를 누르면 해당 인원 명단 모달 |
| `/members` | `app/members/page.tsx` | 교적 관리 — 관리자 전용 (학생/교사 정보 추가·수정·삭제 + 특정 날짜 출석 상태 수정) |
| `/birthday` | `app/birthday/page.tsx` | 생일자 조회 |
| `/registry` | `app/registry/page.tsx` | 교적부 — 교사용(session) 열람 전용 학생 명단 데이터 그리드 (TanStack Table: 세션/학년 탭 필터·이름 검색·컬럼 정렬, sticky 헤더/좌측 열, 반별 담당교사 칩) |
| `/teachers` | `app/teachers/page.tsx` | 교사 현황 — 관리자(admin) 전용 교사 명단 데이터 그리드 (교적부의 교사판: 세션/팀 탭 필터·이름 검색·정렬·sticky, 컬럼 번호·이름·팀·연락처·생년월일·주소·출석률(1년기준)·비고). `/members`에서 "교사 현황" 버튼으로 진입 |

### 관리자 모드 진입 플로우
1. 메인 화면에 "학생 관리" 버튼 존재
2. 클릭 시 비밀번호 입력 모달 표시
3. `POST /api/auth` 로 비밀번호 검증
4. 성공 시 `sessionStorage`에 토큰 저장 후 `/members` 진입

### `/members` 화면 기능 범위 (레거시 GAS `students.html` 1:1 대응)
- 학생/교사 정보 추가·수정·삭제 (`/api/students`, `/api/teachers` 풀 CRUD)
- 특정 학생/교사의 특정 날짜 출석 상태 수정 — `/api/attendance` 토글을 그대로 재사용(레거시의 `markAttendance`/`cancelAttendance`가 학생·교사 모두에 대해 관리자 화면에서도 호출됐던 것과 동일한 동작)

## 반응형 웹 설계

### 기기 우선순위
- **모바일 우선(Mobile First)**: 교사/스태프가 주일 예배 중 스마트폰으로 출석 체크하는 것이 주요 사용 시나리오
- **보조 기기**: 태블릿 또는 데스크탑 (관리자의 교적 관리)

### 브레이크포인트 (Tailwind 기본값 사용)
| 접두사 | 최소 너비 | 주요 적용 |
|--------|-----------|-----------|
| (기본) | 0px~      | 모바일 1열 레이아웃 |
| `sm`   | 640px~    | 카드 2열 |
| `md`   | 768px~    | 카드 3열, 사이드 여백 추가 |
| `lg`   | 1024px~   | 카드 4열, 테이블 전체 컬럼 표시 |

### 페이지별 반응형 동작
- **출석체크 메인 (`/`)**: MemberCard 그리드 — 모바일 1열 → sm 2열 → md 3열 → lg 4열
- **출석 현황 (`/history`)**: 학년/반 그룹 헤더 고정, 모바일에서 가로 스크롤 없이 세로 스택
- **교적 관리 (`/members`)**: 카드/필 그리드(`/`·`/history`와 동일한 티켓 스타일) — 단일 레이아웃이 `flex-wrap`으로 데스크탑/모바일 모두 자연스럽게 줄바꿈, 별도의 `<table>` 뷰는 두지 않음
- **생일자 조회 (`/birthday`)**: 모바일/데스크탑 모두 단순 리스트

### 터치 인터랙션
- MemberCard 탭 영역 최소 높이 44px (iOS/Android 권장 터치 타겟)
- 출석 토글은 카드 전체 영역이 탭 가능해야 함

## API 엔드포인트 설계

```
GET  /api/roster?session=오전                        → 세션별 학생·교사 명단 조회 (출석체크·출석현황 전용)

GET  /api/attendance?date=YYYY-MM-DD&session=오전   → 출석 학생 ID 목록(studentIds) 조회
POST /api/attendance                                 → 출석 상태 변경 (토글)
GET  /api/attendance/range?from=&to=                 → 기간 출석 조회 → { dates: { "YYYY-MM-DD": [id...] } }
                                                       (출석 현황의 기간 모드 전용. session 파라미터 없음 —
                                                        세션 좁히기는 화면이 roster로 한다. 시트 1회 읽기로
                                                        범위 전체를 반환하며 주별 N회 호출은 금지)

GET  /api/students?session=오전                      → 학생 목록 조회
POST /api/students                                   → 신규 학생 등록
PUT  /api/students/[id]                              → 학생 정보 수정
DELETE /api/students/[id]                            → 학생 삭제

GET  /api/teachers?session=오전                      → 교사 목록 조회
POST /api/teachers                                   → 신규 교사 등록
PUT  /api/teachers/[id]                              → 교사 정보 수정
DELETE /api/teachers/[id]                            → 교사 삭제

GET  /api/birthdays?session=오전                     → 세션별 학생·교사 전체 반환 (월별 필터링·그룹핑은 클라이언트의 groupBirthdaysByMonth가 담당, month 쿼리파라미터 없음)

GET  /api/stats?session=오전                         → 최근 1년 학년별·교사별 출석률 통계
GET  /api/stats/member?id=&session=오전              → 개인(학생/교사) 최근 3개월·1년 출석일수/예배일수
GET  /api/stats/rates                                → 전 인원 1년 출석률 일괄 계산 → { total1y, rates: { [id]: % } }
                                                       (교적부·교사 현황의 "출석률(1년기준)" 컬럼용. 세션 무관,
                                                        Attendance 1회 읽기로 계산 — 시트의 출석률 컬럼은 비어 있음)

GET  /api/summary?date=YYYY-MM-DD&session=오전       → 요약 통계 (현재 미사용 — roster+attendance로 클라이언트에서 직접 계산, 엔드포인트는 보류 상태로 유지)
POST /api/auth { password, role }                    → role별(session/admin) 비밀번호 검증
```

## 프로젝트 폴더 구조

```
src/
├── app/
│   ├── page.tsx                        ✅ 출석체크 메인
│   ├── history/page.tsx                ✅ 출석 현황 (1주 기본 / 기간 모드 — weeks=1이 곧 1주 모드라 렌더 경로는 하나)
│   ├── members/page.tsx                ✅ 교적 관리 (관리자) — Google Sheets 실연동, 비밀번호 게이트
│   ├── birthday/page.tsx               ✅ 생일자 조회
│   ├── registry/page.tsx               ✅ 교적부 (교사용 열람 전용 학생 명단 그리드) — session 게이트
│   ├── teachers/page.tsx               ✅ 교사 현황 (관리자 열람 전용 교사 명단 그리드) — admin 게이트
│   ├── providers.tsx                   ✅ React Query QueryClientProvider + 전역 ScrollToTopButton
│   ├── layout.tsx                      ✅ 루트 레이아웃
│   ├── template.tsx                    ✅ 페이지 전환 크로스페이드 (라우트 이동마다 리마운트). **opacity만 사용** — transform을 쓰면 이 래퍼가 containing block이 되어 내부 position:fixed(모달·플로팅 바)가 깨짐
│   ├── globals.css                     ✅ 전역 스타일 — 색 토큰(paper/ink/stamp/teal/gold/celebrate) + @keyframes(rise-in, shake, pop-from-anchor 등)
│   ├── icon.tsx / apple-icon.tsx       ✅ Next.js 파일 기반 아이콘(파비콘/애플 터치 아이콘)
│   └── api/
│       ├── attendance/
│       │   ├── route.ts                ✅ 출석 조회(GET) / 토글(POST)
│       │   └── range/route.ts          ✅ 기간 출석 조회(GET) — 시트 1회 읽기로 날짜→ID 맵 반환
│       ├── roster/route.ts             ✅ 세션별 학생·교사 명단 조회(GET)
│       ├── birthdays/route.ts          ✅ 월별 생일자 조회(GET)
│       ├── summary/route.ts            ✅ 요약 통계(GET) — 미사용 보류
│       ├── stats/
│       │   ├── route.ts                ✅ 1년 출석 통계(GET) — 학년별·교사별 집계
│       │   ├── member/route.ts         ✅ 개인 출석 통계(GET) — 최근 3개월/1년 (학생·교사 폼)
│       │   └── rates/route.ts          ✅ 전 인원 1년 출석률 일괄 계산(GET) — id→% 맵 (교적부·교사 현황 컬럼)
│       ├── students/
│       │   ├── route.ts                ✅ 학생 목록 조회(GET) / 신규 등록(POST)
│       │   └── [id]/route.ts           ✅ 학생 수정(PUT) / 삭제(DELETE)
│       ├── teachers/
│       │   ├── route.ts                ✅ 교사 목록 조회(GET) / 신규 등록(POST)
│       │   └── [id]/route.ts           ✅ 교사 수정(PUT) / 삭제(DELETE)
│       └── auth/route.ts               ✅ 관리자 비밀번호 검증(POST)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                  ✅ 세션(오전/오후) 선택 + 날짜 표시 (mobileMenu prop 전달 시 모바일 2줄 배치)
│   │   └── MobileNavMenu.tsx           ✅ 모바일 햄버거 내비 — 햄버거↔X 모핑 버튼 + 버튼에서 펼쳐지는 팝오버(portal)
│   ├── attendance/
│   │   ├── MemberCard.tsx              ✅ 출석 카드 (학생/교사 공통)
│   │   ├── FilterChips.tsx             ✅ 학년·반·팀·새친구 필터
│   │   ├── GradeSection.tsx            ✅ 학년별 그룹
│   │   ├── GradeSectionSkeleton.tsx    ✅ GradeSection/RosterSection 로딩 스켈레톤 (/ · /members 공용)
│   │   ├── SummaryBar.tsx              ✅ 전체/출석/결석/출석률 (잉크색 점수판, 숫자는 RollingNumber) + caption(예: "4주 평균")
│   │   └── FloatingSummaryBar.tsx      ✅ 본문 SummaryBar가 화면 밖으로 나가면 상단에 미끄러져 나타나는 플로팅 요약 바 (caption도 함께 표시)
│   ├── history/
│   │   ├── ServiceDateSelector.tsx     ✅ 조회 구간 선택 — 기준일(=종료일) + 기간 길이(1/2/4/8/13주·올해 전체·직접 지정)
│   │   ├── AttendanceListModal.tsx     ✅ 명단 모달 — 제목 고정 + 본문만 스크롤. 1주: 출석/결석 칩 · 기간: 개인별 n/N회 + RateBar. MemberItem.type이 채워져 학생·교사가 섞이면 sticky 머리글로 나눠 표시
│   │   ├── GroupAttendanceChart.tsx    ✅ 그룹별 출석 차트 (attendCounts + weeks — 기간 모드는 주당 평균 인원). 클릭은 막대가 아니라 **행 전체를 덮은 HTML 버튼**이 받는다(막대는 값에 비례해 타깃이 좁아짐) — 그래서 recharts 툴팁은 없음
│   │   ├── GroupAttendanceChartSkeleton.tsx ✅ 출석 차트 로딩 스켈레톤
│   │   ├── WeeklyTrendChart.tsx        ✅ 주차별 출석 추이 (면적+평균선, 클릭 시 그 주 1주 모드로 이동) — 기간 모드 전용. x축 첫 눈금에만 달력 아이콘(DateTick)
│   │   ├── WeeklyTrendChartSkeleton.tsx ✅ 주차별 추이 로딩 스켈레톤 (실제 차트와 높이 동일 — 데이터 도착 시 밀리지 않게)
│   │   └── AttendanceHighlights.tsx    ✅ 개근/부분 출석/결석 인원 칩 → AttendanceListModal 재사용 — 기간 모드 전용. 세 칩의 합 = 명단 인원
│   ├── stats/
│   │   └── YearlyStats.tsx             ✅ 1년 통계 플로팅 오버레이 (도넛 차트)
│   ├── students/
│   │   └── StudentForm.tsx             ✅ 학생 추가/수정/삭제 모달 폼 (출석 수정 포함)
│   ├── teachers/
│   │   └── TeacherForm.tsx             ✅ 교사 추가/수정/삭제 모달 폼 (출석 수정 포함)
│   ├── registry/
│   │   ├── RegistryTable.tsx           ✅ 교적부 통합 테이블 (TanStack Table: 세션/학년 탭·이름 검색·정렬·sticky·담당교사 칩)
│   │   ├── RegistryTableSkeleton.tsx   ✅ 교적부 로딩 스켈레톤
│   │   ├── TeacherRegistryTable.tsx    ✅ 교사 현황 통합 테이블 (교적부 교사판: 세션/팀 탭·이름 검색·정렬·sticky)
│   │   ├── TeacherRegistryTableSkeleton.tsx ✅ 교사 현황 로딩 스켈레톤
│   │   └── RateBar.tsx                 ✅ 출석률 셀 시각화 (미니 막대 + 색상 코딩: 80%↑ teal / 50%↑ gold / 이하 stamp)
│   ├── ui/                             # shadcn 스타일 프리미티브 (Radix 아님 — Base UI `@base-ui/react` 기반)
│   │   ├── button.tsx / card.tsx / dialog.tsx  ✅ 기본 프리미티브
│   │   ├── chart.tsx                   ✅ recharts 래퍼 (ChartContainer / ChartTooltipContent). ⚠️ 축·그리드 셀렉터가 recharts v2 클래스명 기준이라 v3에서 매칭 안 되는 것이 남아 있음 — 새 차트 추가 시 확인
│   │   └── tooltip.tsx                 ✅ hover 툴팁 (교적부 학교명 전체 표시용, Portal 렌더라 스크롤 영역에 안 잘림)
│   └── common/
│       ├── AuthGateModal.tsx           ✅ 비밀번호 입력 모달 (admin/session 공용, 오류 시 shake)
│       ├── AlertDialog.tsx             ✅ 경고 알림 모달 (네이티브 alert() 대체 — 제목 + 라벨/값 상세 + 확인 버튼)
│       ├── PublicGate.tsx              ✅ 공개 4화면(/, /history, /birthday, /registry) 교사용 게이트 래퍼
│       ├── Skeleton.tsx                ✅ 로딩 스켈레톤 프리미티브 (pulse 박스 — 각 화면 스켈레톤이 공용)
│       ├── RollingNumber.tsx           ✅ 자릿수 굴러가는 숫자 (@number-flow/react 래퍼, 마운트 시 0→값 카운팅)
│       ├── LiveClock.tsx               ✅ 현재 시각 롤링 시계 (Header에서 사용)
│       ├── LoadingOverlay.tsx          ✅ 저장/삭제 처리 중 팝업 전체를 덮는 스피너 오버레이 (학생/교사 폼)
│       └── ScrollToTopButton.tsx       ✅ 전역 우측 하단 TOP 버튼 — 일정 이상 스크롤 시 노출 (providers.tsx에 마운트)
├── hooks/
│   ├── useAttendance.ts                ✅ 출석 데이터 + 30초 polling + Optimistic Update (토글 전용 — 기간 조회는 아래 훅)
│   ├── useAttendanceRange.ts           ✅ 기간 출석 데이터 (읽기 전용) — 진행 중인 주를 볼 때만 30초 polling
│   ├── useRoster.ts                    ✅ 학생/교사 명단 + 30초 polling
│   ├── useBirthdays.ts                 ✅ 생일자 데이터 (polling 없음)
│   ├── useStudents.ts                  ✅ 학생 CRUD (useQuery + useMutation)
│   ├── useTeachers.ts                  ✅ 교사 CRUD (useQuery + useMutation)
│   └── useAuthGate.ts                  ✅ 인증 상태 (admin/session role별 sessionStorage 분리)
├── api/                                # fetch 함수 모음 (클라이언트 → Route Handler)
│   ├── attendance.ts                   ✅ getAttendance(날짜) / getAttendanceRange(기간) / toggleAttendance
│   ├── roster.ts                       ✅ getRoster — 세션별 학생·교사 명단
│   ├── birthdays.ts                    ✅ getBirthdayRoster — 생일자 조회용 세션별 전체 명단
│   ├── stats.ts                        ✅ getStats(학년·교사 집계) / getMemberStats(개인) / getAttendanceRates(전 인원 %)
│   ├── students.ts                     ✅ getStudents / createStudent / updateStudent / deleteStudent
│   └── teachers.ts                     ✅ getTeachers / createTeacher / updateTeacher / deleteTeacher
├── lib/
│   ├── sheets.ts                       ✅ Google Sheets API v4 클라이언트 (readSheet / appendRow / findRowNumber / updateRow / deleteRow)
│   ├── group-members.ts                ✅ 학생·교사 그룹핑 유틸 (학년→반→이름 정렬) + MemberItem 타입(선택 필드 `type`으로 학생/교사 구분)
│   ├── attendance-range.ts             ✅ 기간 조회 유틸 — resolveRange(기준일+기간→구간, 올해 밖으로 안 나감) / buildRangeStats(집계)
│   ├── date.ts                         ✅ 한국 시간 기준 날짜 유틸 (formatDateLabel 전체 표기 / formatDateLabelShort 연도 생략 — 폭이 빠듯한 조회 컨트롤 전용)
│   ├── birthdays.ts                    ✅ 생일 계산 유틸
│   ├── lunar.ts                        ✅ 음력→해당 연도 양력 변환 (korean-lunar-calendar) — 교사 Lunar 생일자 처리
│   └── utils.ts                        ✅ Tailwind clsx + tailwind-merge 유틸 (cn — 뒤 클래스가 앞 클래스를 덮어씀)
└── types/
    └── index.ts                        ✅ 전역 타입 정의 (Session / MemberType / Student / Teacher / AttendanceRecord)
```

## 비즈니스 로직 요약

1. **세션 분리**: 오전/오후 세션별로 학생과 교사 데이터가 완전히 분리됨
2. **정렬 기준**: 학년 → 반 → 이름순 (한국어 localeCompare)
3. **교사 팀 순서**: 총무팀 → 예배지원팀 → 1학년교사 → 2학년교사 → 3학년교사 → 새친구반
4. **학생 ID 생성**: `연도-학년-반-순번(3자리)` 형식, 같은 그룹 내 최대 순번 + 1
5. **요약 통계**: 전체 인원 / 출석 인원 / 결석 인원 / 출석률(%)
6. **날짜 기준**: 한국 시간(Asia/Seoul) 기준 오늘 날짜

## 환경변수 목록

```env
# Google Sheets API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SPREADSHEET_ID=

# 관리자 비밀번호 (/members 전용)
ADMIN_PASSWORD=

# 교사용 비밀번호 (공개 4화면: /, /history, /birthday, /registry 게이트)
SESSION_PASSWORD=
```

실제 값은 `.env.local`에만 작성하고, `docs/context-notes.md`나 코드 주석에도 평문으로 남기지 않습니다.

