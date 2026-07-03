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
별도 로그인 없이 공개 접근이 가능하되, 관리자 모드 진입 시 비밀번호 모달을 통해 검증합니다.
비밀번호는 Vercel 환경변수에 저장하고 Route Handler에서 검증합니다. (프론트엔드에 노출 없음)

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
| Ect | string | 기타 비고(자유 텍스트, 예: `타교회 선교(OO목사님 확인)`) — `student`/`teacher` 구분과 무관한 별개 컬럼 |
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

## 화면 구성 (4개 페이지)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 출석체크 메인 (카드 UI, 세션 필터, 요약 통계) |
| `/history` | `app/history/page.tsx` | 출석 현황 (학년/반/팀별 그룹핑) |
| `/members` | `app/members/page.tsx` | 교적 관리 — 관리자 전용 (학생/교사 정보 추가·수정·삭제 + 특정 날짜 출석 상태 수정) |
| `/birthday` | `app/birthday/page.tsx` | 생일자 조회 |

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
GET  /api/attendance?date=YYYY-MM-DD&session=오전   → 출석 목록 조회
POST /api/attendance                                 → 출석 상태 변경 (토글)

GET  /api/students?session=오전                      → 학생 목록 조회
POST /api/students                                   → 신규 학생 등록
PUT  /api/students/[id]                              → 학생 정보 수정
DELETE /api/students/[id]                            → 학생 삭제

GET  /api/teachers?session=오전                      → 교사 목록 조회
POST /api/teachers                                   → 신규 교사 등록
PUT  /api/teachers/[id]                              → 교사 정보 수정
DELETE /api/teachers/[id]                            → 교사 삭제

GET  /api/birthdays?month=1                          → 월별 생일자 조회

GET  /api/summary?date=YYYY-MM-DD&session=오전       → 요약 통계
POST /api/auth                                       → 관리자 비밀번호 검증
```

## 프로젝트 폴더 구조

✅ = 구현 완료 / 🔲 = Phase 5·6 구현 예정

```
src/
├── app/
│   ├── page.tsx                        ✅ 출석체크 메인
│   ├── history/page.tsx                ✅ 출석 현황
│   ├── members/page.tsx                ✅ 교적 관리 (관리자) — 현재 목업 데이터 기반
│   ├── birthday/page.tsx               ✅ 생일자 조회
│   └── api/
│       ├── attendance/route.ts         ✅ 출석 조회/토글
│       ├── roster/route.ts             ✅ 세션별 명단 조회
│       ├── birthdays/route.ts          ✅ 생일자 조회
│       ├── summary/route.ts            ✅ 요약 통계 (보류 중 — 미사용)
│       ├── stats/route.ts              ✅ 1년 출석 통계
│       ├── students/
│       │   ├── route.ts                🔲 학생 목록 조회(GET) / 신규 등록(POST)
│       │   └── [id]/route.ts           🔲 학생 수정(PUT) / 삭제(DELETE)
│       ├── teachers/
│       │   ├── route.ts                🔲 교사 목록 조회(GET) / 신규 등록(POST)
│       │   └── [id]/route.ts           🔲 교사 수정(PUT) / 삭제(DELETE)
│       └── auth/route.ts               🔲 관리자 비밀번호 검증(POST)
├── components/
│   ├── layout/
│   │   └── Header.tsx                  ✅ 세션(오전/오후) 선택 + 날짜 표시
│   ├── attendance/
│   │   ├── MemberCard.tsx              ✅ 출석 카드 (학생/교사 공통)
│   │   ├── GradeSection.tsx            ✅ 학년별 그룹
│   │   └── SummaryBar.tsx              ✅ 전체/출석/결석/출석률
│   ├── stats/
│   │   └── YearlyStats.tsx             ✅ 1년 통계 플로팅 오버레이 (도넛 차트)
│   ├── students/
│   │   └── StudentForm.tsx             ✅ 학생 추가/수정/삭제 모달 폼
│   ├── teachers/
│   │   └── TeacherForm.tsx             ✅ 교사 추가/수정/삭제 모달 폼
│   └── common/
│       ├── AdminModal.tsx              🔲 비밀번호 입력 모달
│       └── LoadingOverlay.tsx
├── hooks/
│   ├── useAttendance.ts                ✅ 출석 데이터 + 30초 polling + Optimistic Update
│   ├── useRoster.ts                    ✅ 학생/교사 명단 + 30초 polling
│   ├── useBirthdays.ts                 ✅ 생일자 데이터 (polling 없음)
│   ├── useStudents.ts                  🔲 학생 CRUD (React Query mutation)
│   ├── useTeachers.ts                  🔲 교사 CRUD (React Query mutation)
│   └── useAdminAuth.ts                 🔲 관리자 인증 상태 (sessionStorage)
├── api/                                # fetch 함수 모음 (클라이언트 → Route Handler)
│   ├── attendance.ts                   ✅
│   ├── roster.ts                       ✅
│   ├── birthdays.ts                    ✅
│   ├── stats.ts                        ✅
│   ├── students.ts                     🔲
│   └── teachers.ts                     🔲
├── lib/
│   └── sheets.ts                       ✅ Google Sheets API v4 클라이언트 (updateRow 추가 예정)
└── types/
    └── index.ts                        ✅ 전역 타입 정의
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

# 관리자 비밀번호
ADMIN_PASSWORD=
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
- [ ] Phase 6: `/members` 페이지 — UI-API 연결 (목업 → 실제 fetch)
  - [ ] Step 1. `src/api/students.ts` / `teachers.ts` — CRUD fetch 래퍼
  - [ ] Step 2. `src/hooks/useStudents.ts` — `useQuery`(명단) + `useMutation`(추가/수정/삭제), `src/hooks/useTeachers.ts` — 동일 패턴
  - [ ] Step 3. `src/hooks/useAdminAuth.ts` — `sessionStorage` 기반 토큰 저장·검증, `src/components/common/AdminModal.tsx` — 비밀번호 입력 모달 (`POST /api/auth` 호출)
  - [ ] Step 4. `src/app/members/page.tsx` 실연동 — 목업 state → `useStudents`/`useTeachers`로 교체, 비밀번호 게이트(`useAdminAuth` + `AdminModal`) 적용
  - [ ] Step 5. `src/lib/mock-data.ts` `/members` 의존 제거 후 파일 삭제, `npm run build` 통과 + 브라우저 검증 (CRUD 전체 플로우, 비밀번호 게이트, 토큰 만료)
- [ ] Phase 7: Vercel 배포 및 검증
