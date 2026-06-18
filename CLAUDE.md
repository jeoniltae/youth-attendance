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
| Type | string | `student` \| `teacher` |

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
  type: MemberType;
}
```

## 화면 구성 (4개 페이지)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 출석체크 메인 (카드 UI, 세션 필터, 요약 통계) |
| `/history` | `app/history/page.tsx` | 출석 현황 (학년/반/팀별 그룹핑) |
| `/students` | `app/students/page.tsx` | 교적 관리 — 관리자 전용 |
| `/birthday` | `app/birthday/page.tsx` | 생일자 조회 |

### 관리자 모드 진입 플로우
1. 메인 화면에 "학생 관리" 버튼 존재
2. 클릭 시 비밀번호 입력 모달 표시
3. `POST /api/auth` 로 비밀번호 검증
4. 성공 시 `sessionStorage`에 토큰 저장 후 `/students` 진입

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

GET  /api/birthdays?month=1                          → 월별 생일자 조회

GET  /api/summary?date=YYYY-MM-DD&session=오전       → 요약 통계
POST /api/auth                                       → 관리자 비밀번호 검증
```

## 프로젝트 폴더 구조

```
src/
├── app/
│   ├── page.tsx                    # 출석체크 메인
│   ├── history/page.tsx            # 출석 현황
│   ├── students/page.tsx           # 교적 관리 (관리자)
│   ├── birthday/page.tsx           # 생일자 조회
│   └── api/
│       ├── attendance/route.ts
│       ├── students/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── teachers/route.ts
│       ├── birthdays/route.ts
│       ├── summary/route.ts
│       └── auth/route.ts
├── components/
│   ├── layout/
│   │   └── Header.tsx              # 세션(오전/오후) 선택 + 날짜 표시
│   ├── attendance/
│   │   ├── MemberCard.tsx          # 출석 카드 (학생/교사 공통)
│   │   ├── GradeSection.tsx        # 학년별 그룹
│   │   └── SummaryBar.tsx          # 전체/출석/결석/출석률
│   ├── students/
│   │   ├── StudentForm.tsx         # 학생 추가/수정 폼
│   │   └── StudentTable.tsx        # 교적 목록
│   └── common/
│       ├── AdminModal.tsx          # 비밀번호 입력 모달
│       └── LoadingOverlay.tsx
├── hooks/
│   ├── useAttendance.ts            # 출석 데이터 + 30초 polling
│   ├── useStudents.ts              # 학생 CRUD
│   └── useAdminAuth.ts             # 관리자 인증 상태 (sessionStorage)
├── api/                            # fetch 함수 모음 (클라이언트 → Route Handler)
│   ├── attendance.ts
│   ├── students.ts
│   └── teachers.ts
├── lib/
│   └── sheets.ts                   # Google Sheets API v4 클라이언트
└── types/
    └── index.ts                    # 전역 타입 정의
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
- [ ] Phase 1: 프로젝트 초기 세팅
- [ ] Phase 2: Google Sheets API 연동 (Route Handlers)
- [ ] Phase 3: 화면 구현 (4개 페이지)
- [ ] Phase 4: Vercel 배포 및 검증
