# 고등부 전자출석부 — 프로젝트 컨텍스트

## 관련 문서

작업 전에 아래 문서를 반드시 확인하세요.

- 코딩 규칙 및 금지 사항: `docs/coding-guidelines.md`
- 작업 결정 기록: `docs/context-notes.md`
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
| Team | string | `총무팀` \| `예배지원팀` \| `1학년교사` \| `2학년교사` \| `3학년교사` |
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
| `/history` | `app/history/page.tsx` | 출석 현황 (학년/반/팀별 그룹핑) |
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
│   ├── history/page.tsx                ✅ 출석 현황
│   ├── members/page.tsx                ✅ 교적 관리 (관리자) — Google Sheets 실연동, 비밀번호 게이트
│   ├── birthday/page.tsx               ✅ 생일자 조회
│   ├── registry/page.tsx               ✅ 교적부 (교사용 열람 전용 학생 명단 그리드) — session 게이트
│   ├── teachers/page.tsx               ✅ 교사 현황 (관리자 열람 전용 교사 명단 그리드) — admin 게이트
│   ├── providers.tsx                   ✅ React Query QueryClientProvider + 전역 ScrollToTopButton
│   ├── layout.tsx                      ✅ 루트 레이아웃
│   ├── globals.css                     ✅ 전역 스타일 — 색 토큰(paper/ink/stamp/teal/gold/celebrate) + @keyframes(rise-in, shake, pop-from-anchor 등)
│   ├── icon.tsx / apple-icon.tsx       ✅ Next.js 파일 기반 아이콘(파비콘/애플 터치 아이콘)
│   └── api/
│       ├── attendance/route.ts         ✅ 출석 조회(GET) / 토글(POST)
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
│   │   ├── SummaryBar.tsx              ✅ 전체/출석/결석/출석률 (잉크색 점수판, 숫자는 RollingNumber)
│   │   └── FloatingSummaryBar.tsx      ✅ 본문 SummaryBar가 화면 밖으로 나가면 상단에 미끄러져 나타나는 플로팅 요약 바
│   ├── history/
│   │   ├── AttendanceListModal.tsx     ✅ 출석 현황 상세 모달
│   │   ├── GroupAttendanceChart.tsx    ✅ 그룹별 출석 차트
│   │   └── GroupAttendanceChartSkeleton.tsx ✅ 출석 차트 로딩 스켈레톤
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
│   │   ├── button.tsx / card.tsx / chart.tsx / dialog.tsx  ✅
│   │   └── tooltip.tsx                 ✅ hover 툴팁 (교적부 학교명 전체 표시용, Portal 렌더라 스크롤 영역에 안 잘림)
│   └── common/
│       ├── AuthGateModal.tsx           ✅ 비밀번호 입력 모달 (admin/session 공용, 오류 시 shake)
│       ├── PublicGate.tsx              ✅ 공개 4화면(/, /history, /birthday, /registry) 교사용 게이트 래퍼
│       ├── Skeleton.tsx                ✅ 로딩 스켈레톤 프리미티브 (pulse 박스 — 각 화면 스켈레톤이 공용)
│       ├── RollingNumber.tsx           ✅ 자릿수 굴러가는 숫자 (@number-flow/react 래퍼, 마운트 시 0→값 카운팅)
│       ├── LiveClock.tsx               ✅ 현재 시각 롤링 시계 (Header에서 사용)
│       ├── LoadingOverlay.tsx          ✅ 저장/삭제 처리 중 팝업 전체를 덮는 스피너 오버레이 (학생/교사 폼)
│       └── ScrollToTopButton.tsx       ✅ 전역 우측 하단 TOP 버튼 — 일정 이상 스크롤 시 노출 (providers.tsx에 마운트)
├── hooks/
│   ├── useAttendance.ts                ✅ 출석 데이터 + 30초 polling + Optimistic Update
│   ├── useRoster.ts                    ✅ 학생/교사 명단 + 30초 polling
│   ├── useBirthdays.ts                 ✅ 생일자 데이터 (polling 없음)
│   ├── useStudents.ts                  ✅ 학생 CRUD (useQuery + useMutation)
│   ├── useTeachers.ts                  ✅ 교사 CRUD (useQuery + useMutation)
│   └── useAuthGate.ts                  ✅ 인증 상태 (admin/session role별 sessionStorage 분리)
├── api/                                # fetch 함수 모음 (클라이언트 → Route Handler)
│   ├── attendance.ts                   ✅
│   ├── roster.ts                       ✅
│   ├── birthdays.ts                    ✅
│   ├── stats.ts                        ✅
│   ├── students.ts                     ✅
│   └── teachers.ts                     ✅
├── lib/
│   ├── sheets.ts                       ✅ Google Sheets API v4 클라이언트 (readSheet / appendRow / findRowNumber / updateRow / deleteRow)
│   ├── group-members.ts                ✅ 학생·교사 그룹핑 유틸 (학년→반→이름 정렬)
│   ├── date.ts                         ✅ 한국 시간 기준 날짜 유틸
│   ├── birthdays.ts                    ✅ 생일 계산 유틸
│   ├── lunar.ts                        ✅ 음력→해당 연도 양력 변환 (korean-lunar-calendar) — 교사 Lunar 생일자 처리
│   └── utils.ts                        ✅ Tailwind clsx + tailwind-merge 유틸 (cn — 뒤 클래스가 앞 클래스를 덮어씀)
└── types/
    └── index.ts                        ✅ 전역 타입 정의 (Session / MemberType / Student / Teacher / AttendanceRecord)
```

## 비즈니스 로직 요약

1. **세션 분리**: 오전/오후 세션별로 학생과 교사 데이터가 완전히 분리됨
2. **정렬 기준**: 학년 → 반 → 이름순 (한국어 localeCompare)
3. **교사 팀 순서**: 총무팀 → 예배지원팀 → 1학년교사 → 2학년교사 → 3학년교사
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

## 마이그레이션 진행 상태

- [x] 요구사항 분석 완료
- [x] GAS 코드 분석 완료
- [x] 기술 스택 확정
- [x] API 설계 완료
- [x] 타입 정의 완료
- [x] Phase 1: 프로젝트 초기 세팅
- [x] Phase 2: UI 구현 (목업 데이터 기반, 4개 페이지)
  - [x] 출석체크 메인 (`/`)
  - [x] 출석 현황 (`/history`)
  - [x] 생일자 조회 (`/birthday`)
  - [x] 교적 관리 (`/members`) — 관리자 전용, 학생/교사 추가·수정·삭제 모달 폼 + 학년/반/팀/새친구 필터(기존 `FilterChips`/`group-members.ts` 재사용), 로컬 state 기반 목업 CRUD. 출석 상태 수정·비밀번호 게이트·실 API 연동은 Phase 5/6에서 처리
- [x] Phase 3: Google Sheets API 연동 — 출석/생일/통계 Route Handlers
  - [x] Step 0. 외부 설정 (Google Cloud 프로젝트/Sheets API 활성화, Service Account 키 발급, 테스트용 스프레드시트 생성·더미 데이터 입력, `.env.local` 채우기) — Sheets API로 탭 3개/헤더 전부 일치 확인 완료
  - [x] Step 1. `src/lib/sheets.ts`에 헬퍼 추가: `readSheet`, `appendRow`, `findRowNumber`, `deleteRow` (쓰기는 `valueInputOption: 'RAW'`, 읽기는 `valueRenderOption: 'FORMATTED_VALUE'`로 날짜 자동변환 방지) — 4개 함수 전부 동작 확인 완료
  - [x] Step 2. `src/app/api/summary/route.ts` — `GET ?date=&session=` → `{ total, attended, absent, rate }` — curl 검증 완료
  - [x] Step 3. `src/app/api/birthdays/route.ts` — `GET ?session=` → `{ students, teachers }` — curl 검증 완료
  - [x] Step 4. `src/app/api/attendance/route.ts` — `GET ?date=&session=` → `{ studentIds }`, `POST`(토글) — curl 검증 완료 (토글 출석↔결석, 학생/교사 케이스)
  - [x] Step 5. `src/app/api/roster/route.ts` — `GET ?session=` → `{ students, teachers }` (출석체크·출석현황 전용 명단 엔드포인트, birthdays와 별도 분리) — curl 검증 완료
  - [x] Step 6. 공통 에러 처리 (400/500 규칙 적용), `npm run build` 통과 확인
- [x] Phase 4: UI-API 연결 — 출석/생일/현황 3개 페이지 (목업 → 실제 fetch)
  - [x] Step 0. `src/app/providers.tsx` 신규(React Query `QueryClientProvider`) 추가, `src/app/layout.tsx` 한 줄 수정 — `npm run build` 통과
  - [x] Step 1. `src/api/roster.ts` / `attendance.ts` / `birthdays.ts` / `stats.ts` 신규 — fetch+JSON+에러throw 얇은 래퍼
  - [x] Step 2. `src/hooks/useRoster.ts`(30초 polling) / `useBirthdays.ts` / `useAttendance.ts`(Optimistic Update, `onMutate`/`onError`/`onSettled`) 신규
  - [x] Step 3a. `src/app/birthday/page.tsx` 실연동 — `useBirthdays` 교체, 브라우저 검증 완료
  - [x] Step 3b. `src/app/history/page.tsx` 실연동 — `useRoster`+`useAttendance` 교체, 브라우저 검증 완료
  - [x] Step 3c. `src/app/page.tsx` 실연동 — `useRoster`+`useAttendance` 교체, Optimistic Update·롤백·30초 폴링 브라우저 검증 완료
  - [x] Step 4. `grep -r "mock-data" src/` 0건 확인 (파일 자체는 `/members` 목업용으로 보류)
  - 비고: `/api/summary`는 미사용 — roster+출석 데이터로 클라이언트에서 직접 계산, 중복 폴링 방지. 엔드포인트는 삭제하지 않고 보류
- [x] 부가 기능: 1년 출석 통계 (`/members` 화면)
  - [x] `src/app/api/stats/route.ts` — `GET ?session=` → 최근 1년 학년별·교사별 출석률 집계 (Attendance+Students+Teachers 시트 병렬 읽기)
  - [x] `src/api/stats.ts` — fetch 래퍼
  - [x] `src/components/stats/YearlyStats.tsx` — 플로팅 오버레이 카드, shadcn `ChartContainer` + Recharts 도넛 차트 5개 (전체/1·2·3학년/선생님), 로딩 스켈레톤, 5분 캐시
  - [x] `src/app/members/page.tsx` — 상단 우측 파이차트 아이콘 버튼 추가 (모바일: 아이콘만, sm+: 텍스트 노출)
  - [x] `npm run build` 통과 확인
- [x] Phase 5: `/members` 페이지 — Google Sheets API 연동 (Route Handlers)
  - [x] Step 0. `src/lib/sheets.ts`에 `updateRow` 헬퍼 추가 — `spreadsheets.values.update`로 특정 행 전체 교체 (학생/교사 수정에 필요)
  - [x] Step 1. `src/app/api/students/route.ts` — `GET ?session=` → Students 시트 읽기·필드 매핑, `POST` → ID 생성(`연도-학년-반-순번`) + `appendRow`
  - [x] Step 2. `src/app/api/students/[id]/route.ts` — `PUT` → `findRowNumber` + `updateRow`, `DELETE` → `findRowNumber` + `deleteRow`
  - [x] Step 3. `src/app/api/teachers/route.ts` — `GET ?session=` / `POST`, `src/app/api/teachers/[id]/route.ts` — `PUT` / `DELETE` (students와 동일 패턴)
  - [x] Step 4. `src/app/api/auth/route.ts` — `POST { password }` → `ADMIN_PASSWORD` 환경변수 비교, 성공 시 토큰 반환
  - [x] Step 5. `npm run build` 통과 확인
- [x] Phase 6: `/members` 페이지 — UI-API 연결 (목업 → 실제 fetch)
  - [x] Step 1. `src/api/students.ts` / `teachers.ts` — CRUD fetch 래퍼
  - [x] Step 2. `src/hooks/useStudents.ts` — `useQuery`(명단) + `useMutation`(추가/수정/삭제), `src/hooks/useTeachers.ts` — 동일 패턴
  - [x] Step 3. `src/hooks/useAdminAuth.ts` — `sessionStorage` 기반 토큰 저장·검증, `src/components/common/AdminModal.tsx` — 비밀번호 입력 모달 (`POST /api/auth` 호출)
  - [x] Step 4. `src/app/members/page.tsx` 실연동 — 목업 state → `useStudents`/`useTeachers`로 교체, 비밀번호 게이트(`useAdminAuth` + `AdminModal`) 적용
  - [x] Step 5. `src/lib/mock-data.ts` 파일 삭제, `npm run build` 통과 확인
- [ ] Phase 7 사전 검증: 실제 스프레드시트 연동 검증
  - 전제: 실제 운영 시트를 직접 쓰지 않고 **사본을 만들어 사본으로 검증** (쓰기 API까지 안전하게 테스트). 레거시 GAS 웹앱이 아직 실시트로 운영 중이므로 실시트 구조 변경은 Phase 7 전환 시점에 수행. 테스트 시트의 서비스 계정 공유는 삭제하지 않고 유지 (실험용 롤백 환경)
  - 핵심 리스크: `readSheet`는 헤더 **이름** 기반, `appendRow`/`updateRow`는 컬럼 **순서** 기반 → 둘 다 실시트와 일치해야 함. `FORMATTED_VALUE` 읽기라 실시트 Date/Birthdate 셀이 날짜 서식이면 `YYYY-MM-DD` 문자열 매칭 실패 위험. 실제 Attendance 시트에는 `Type` 컬럼 없음
  - [x] Step 0. 외부 준비 (수동) — 실시트 사본 생성, 사본에 서비스 계정 편집자 공유, `.env.local`의 `GOOGLE_SPREADSHEET_ID`를 사본 ID로 교체 (테스트 시트 ID는 주석으로 보관)
  - [x] Step 1. 구조 검증 스크립트 (`scripts/verify-sheets.mjs`) — 결과: Students(15개)·Teachers(8개) 헤더 완전 일치. Attendance 9열은 소문자 `ect`(코드는 이름으로 안 읽어 영향 없음, 문서만 수정), `Type` 컬럼 없음 확인(Step 2에서 추가). 실시트에 코드 미사용 탭 2개 존재(`NewFamilies`, `등반한 새친구`) — 새 앱은 새친구를 Students의 `Grade="새친구"`로 처리하므로 실데이터 위치 확인 필요(Step 2)
  - [x] Step 2. 사본 Attendance에 `Type` 헤더 추가(J1) + 데이터 형식 점검 (`scripts/verify-data.mjs`) — 결과:
    - ✅ 통과: Attendance Date 4,744건 전부 `YYYY-MM-DD` 문자열(최대 리스크 해소), Session 정확히 `오전`/`오후`, Status 전부 `출석`, Teachers Team 5개 팀명 일치, 학생/교사 ID 중복 없음
    - ❌ 발견·수정: **stats 라우트 버그** — 레거시 행은 `Type`이 빈 값 + `Grade='선생님'`으로 교사를 구분(1,533건)하는데 기존 코드는 `Type===''`을 학생으로 집계 → 교사 통계 0%·전체율 왜곡. `isTeacherRow`(Type 또는 Grade='선생님') 판별로 수정, 전체 출석 합산도 재적 학년만 포함하도록 수정
    - ✅ 발견·해결: **새친구는 Students가 아닌 `NewFamilies` 탭(별도 19컬럼 스키마, 12행)에만 존재**했음 — 새 앱은 Students의 `Grade='새친구'`를 기대. `scripts/migrate-newfamilies.mjs`(멱등, ID 기준 중복 건너뜀, NewFamilies 탭은 보존)로 사본에서 11명 Students로 이전 완료·검증. **Phase 7 실시트 전환 시 이 스크립트 재실행 필요**. 잔여 필드(본래학년/등록일/인도자 등)는 Notes에 합침
    - ⚠️ 수동 수정 필요 (사본 기준 행 번호, 실시트도 동일할 것): Students 81행 Birthdate 형식 오류(`####-##--##`), Students 115행 ID 비어 있음, Students 272행 Class 비어 있음, NewFamilies 11행 ID 비어 있음(이 행은 마이그레이션에서 제외됨)
    - ℹ️ 레거시 GAS와 전체 인원 차이(오전 265 vs 새 앱 267) 원인 규명: 레거시 `getStudents`는 ID/Grade/Class/Name 중 하나라도 빈 행을 **숨김** — 위의 115행(ID 없음)·272행(Class 없음) 2건이 차이의 전부. 새친구 7명은 양쪽 모두 포함(레거시는 NewFamilies 탭에서, 새 앱은 마이그레이션된 Students에서). 데이터 2건 수정 시 양쪽 모두 267로 일치함. **부가 발견: 운영 중인 GAS는 `docs/legacy-gas.json`(6/3 내보내기)에 없는 새가족 기능을 포함 — 내보내기가 구버전이므로 Step 6 판단 시 주의**
    - ⚠️ 기록: 실제 학생 ID 형식은 `YY-학년-반-순번(2자리)`(348건)로 코드 생성 형식 `YYYY-학년-반-순번(3자리)`과 다름(충돌은 없음, 동작 문제 없음). 교사 ID도 `T-YYYY-팀-NNN` 형태로 코드 생성 `T-YYYY-NNN`과 다름. Attendance 새 앱 교사 행은 `Grade=''`+`Type='teacher'`, 레거시는 `Grade='선생님'`+Type 빈 값으로 공존. 고아 참조 42건(탈퇴 교사·학생의 과거 기록 — 무해). Students Birthdate 1건 형식 오류(`YYYY-MM--DD`)·17건 빈 값 → 실시트에서 수동 수정 권장
  - [x] Step 3. 읽기 API 검증 (`scripts/verify-read-api.mjs` — API 응답을 Sheets 직접 읽기와 자동 대조, 오전/오후 각각) — 결과: **전 항목 통과**. roster/students/teachers/birthdays 인원수 시트와 완전 일치(오전 220+47, 오후 150+25), attendance 최근 예배일(2026-06-28) 날짜 매칭 정상(오전 93·오후 54건), 학생 15개·교사 8개 필드 매핑 전부 존재. stats 26주 집계, 교사 출석 정상 집계(오전 980·오후 553건 — Step 2 버그 수정 검증됨). 응답 시간 실데이터 규모(4,744행)에서 400~700ms(콜드 스타트 첫 요청만 2.1s)
  - [x] Step 4. 쓰기 API 검증 (`scripts/verify-write-api.mjs`, 사본에서 실행) — 결과: **전 항목 통과**. 출석 토글 학생/교사 왕복(Type 컬럼 J열에 정상 기록), **Type 빈 값 레거시 행도 삭제·복구 정상**(findRowNumber가 Date+Session+StudentID로만 매칭하므로), 학생 CRUD(더미 `홍길동`, ID `2026-1-99-001` 생성 — 실데이터와 충돌 없음)·교사 CRUD(ID `T-2026-004`) 전부 시트 반영 확인, 최종 무결성 검사에서 세 시트의 행 수·ID 집합이 시작 스냅샷과 완전 동일(원상 복구)
  - [x] Step 5. 브라우저 E2E — 4개 페이지 실데이터 렌더·세션 전환·필터·출석 토글·30초 폴링·`/members` 게이트·1년 통계·모바일 뷰포트 전부 사용자 확인 완료. 이 과정에서 발견·수정한 것:
    - **출석 현황 차트 라벨 밀림 버그** (`GroupAttendanceChart.tsx`) — 결석 0명인 행(폭 0 막대)이 라벨 목록에서 빠지면 recharts `index`가 행과 어긋나 라벨이 한 칸씩 밀림 → `index` 대신 라벨 값(dataKey="label")으로 행을 찾도록 수정
    - **반 정렬 버그** (`group-members.ts`, `birthdays.ts`) — 반 번호가 문자열이라 10반이 1반과 2반 사이에 정렬됨 → `localeCompare(..., { numeric: true })`로 수정 (테스트 시트에는 10반 이상이 없어 실데이터에서만 드러난 문제)
    - **1년 통계 팝업 UI 개선** (`YearlyStats.tsx`) — '전체'를 학년/교사 카드와 분리해 상단 잉크색 점수판 밴드(SummaryBar와 동일 스타일)로 배치, 집계 기간·주평균 출석 수치 추가, 모바일에서 팝업 세로 중앙 정렬(+`max-h-[90dvh]` 스크롤)
    - 레거시(265명)와 새 앱(267명)의 오전 인원 차이 원인 규명 — 위 Step 2의 ℹ️ 항목 참조 (새 앱 문제 아님, 데이터 2건 수정 필요)
  - [x] Step 6. 레거시 GAS 호환성 분석 (6/3 내보내기 기준) — 결론: **실시트 맨 끝 `Type` 컬럼 추가는 GAS를 깨뜨리지 않음**
    - GAS `markAttendance`는 `appendRow`로 앞 8개 컬럼(Date~Timestamp)만 쓰고 ect(I)·Type(J)는 빈 값으로 남김. `cancelAttendance`/모든 읽기는 `headerIndex()` 헤더 이름 기반이라 신규 컬럼 무영향
    - 병행 운영 가능 결론: GAS가 쓰는 출석 행은 Type 빈 값 → 새 앱이 Grade 기반 fallback으로 처리(Step 2 수정·Step 4 검증 완료). 주의점 2가지 — ① 병행 기간에 새로 등록되는 새친구는 GAS는 NewFamilies에, 새 앱은 Students에 기록되어 한쪽에만 보임(`migrate-newfamilies.mjs` 재실행으로 동기화). ② 동시에 같은 사람을 토글하면 이론상 중복 행 가능(발생 확률 낮음, 레코드 유무 판정이라 치명적이지 않음)
    - **ID 형식 결정 (Step 2에서 보류했던 것)**: 최신 GAS의 `generateStudentId`도 새 앱과 동일한 `YYYY-학년-반-순번(3자리)` 형식을 생성함이 확인됨 — 실데이터의 `YY-` 형식 348건은 구버전 시절 데이터. **새 앱 코드 형식 유지 확정**. 교사 ID는 GAS가 `T-YYYY-팀-NNN`, 새 앱이 `T-YYYY-NNN`으로 다르지만 ID를 파싱하는 코드가 양쪽 어디에도 없어 무해 — 현행 유지
    - 사용자 확인: GAS는 6/3 내보내기 이후 수정된 적 없음 → `docs/legacy-gas.json`이 현행 코드 그대로이며 **위 호환성 결론 확정**. (참고: 내보내기에 새가족 기능이 없는데 레거시 화면 오전 인원 265가 새가족 포함으로 계산되는 점은 미해명 — 새 앱 동작과는 무관하므로 추적하지 않음)
  - [x] Step 7. 마무리 — 발견 문제 전부 수정 완료(stats 교사 판별, 차트 라벨, 반 정렬, 통계 팝업 UI), `npm run build` 통과, 결과·결정을 `docs/context-notes.md`에 기록, 보안 체크리스트 확인 완료(변경 파일 전체에서 시트 ID·서비스 계정·개인정보 검출 0건, `.env.local`/`legacy-gas.json` gitignore 정상)
- [ ] Phase 8: Vercel 배포 및 검증
  - 전략: **1차 배포는 Phase 7에서 검증에 쓴 테스트 사본 시트를 그대로 연결**해 외부 사용자 테스트를 먼저 진행하고, 테스트 통과 확인 후에만 실시트로 전환한다. 레거시 GAS 웹앱은 그동안 정상 운영 유지(병행), 실시트는 전환 시점까지 손대지 않음
  - **8-A. 테스트 사본 시트로 배포 + 외부 테스트**
    - [x] Step 1. Vercel 프로젝트 `youth-attendance`(scope: `jeoniltaes-projects`) 생성, GitHub `jeoniltae/youth-attendance` 저장소 연동 완료 — 이후 push마다 자동 배포
    - [x] Step 2. Vercel 환경변수 5종(`GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_PRIVATE_KEY`/`GOOGLE_SPREADSHEET_ID`/`ADMIN_PASSWORD`/`SESSION_PASSWORD`) Production·Preview에 설정 완료 — `GOOGLE_SPREADSHEET_ID`는 테스트 사본 ID 그대로 사용. 값 이전은 Next.js가 실제 쓰는 `@next/env` 파서로 `.env.local`을 그대로 읽어 전달(수동 텍스트 파싱 시 `GOOGLE_PRIVATE_KEY`의 개행·특수문자가 깨질 위험 방지)
    - [x] Step 3. `vercel --prod`로 최초 배포 완료 — Production URL: `https://youth-attendance-opal.vercel.app`
    - [x] Step 4. 배포 URL 스모크 테스트 완료 — 4개 화면(`/`, `/history`, `/birthday`, `/members`) 전부 200, 인증 게이트 `POST /api/auth` session·admin 두 role 모두 정상 비밀번호 200 / 오답 401 확인, API 7종(roster/attendance/students/teachers/birthdays/summary/stats) 전부 200 및 응답 구조 정상. 이 과정에서 CLAUDE.md API 표가 실제 구현과 어긋난 부분 발견·수정(`/api/birthdays`는 `month`가 아닌 `session`만 받음, `/api/roster`·`/api/stats` 누락, `/api/attendance` GET 응답이 `studentIds` 배열, `/api/summary` 미사용 표시, `/api/auth`가 `role` 파라미터로 session/admin 겸용)
    - [ ] Step 5. **진행 중** — 외부 테스터 안내 메시지 초안 작성 완료(비밀번호·테스트 범위·주의사항 포함), 사용자가 비밀번호 채워 직접 전달 예정. ⚠️ 확인된 주의사항: 테스트 사본 시트는 Phase 7 검증용으로 **실제 학생 개인정보(이름·연락처·주소·생년월일)가 그대로 담긴 사본**이므로("다른 사람들과 다를 수 있다"가 아니라 실데이터 그 자체), 테스트 참여자는 기존 GAS 출석부로 이미 이 정보에 접근 권한이 있던 동일 교사진으로 한정 필요
    - [ ] Step 6. 테스트 기간 중 피드백·버그 수집, 발견된 이슈 수정 후 재배포
  - **8-B. 테스트 통과 후 실시트 전환** (착수 전 사용자 승인 필요)
    - [ ] Step 7. 실시트에 Service Account 편집자 권한 공유
    - [ ] Step 8. 실시트 Attendance 시트에 `Type` 컬럼 추가 (Step 6 호환성 분석 결론 반영 — GAS는 이 컬럼을 무시하므로 안전)
    - [ ] Step 9. `scripts/migrate-newfamilies.mjs`를 실시트 대상으로 재실행 (NewFamilies → Students `Grade='새친구'` 이전, 멱등)
    - [ ] Step 10. Phase 7에서 발견한 실시트 수동 수정 필요 항목 처리 (Students Birthdate 형식 오류·ID/Class 빈 값 등 — 실제 행 번호는 사본 기준이었으므로 실시트에서 재확인 필요)
    - [ ] Step 11. Vercel 환경변수 `GOOGLE_SPREADSHEET_ID`를 실시트 ID로 교체, 재배포
    - [ ] Step 12. 실시트 연결 후 최종 확인 — 4개 화면 재검증, 레거시 GAS와 병행 운영 시 인원수·출석 데이터 일치 여부 확인
