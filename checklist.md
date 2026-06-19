# Phase 1 체크리스트 — 프로젝트 초기 세팅

- [x] `create-next-app` 실행 (TypeScript, Tailwind, App Router, src/ 디렉토리)
- [x] `@tanstack/react-query`, `@tanstack/react-query-devtools` 설치
- [x] `googleapis` 설치
- [x] shadcn/ui 초기화 (`npx shadcn@latest init`)
- [x] 폴더 구조 생성 (components/layout, attendance, students, common / hooks / api / lib / types)
- [x] `src/types/index.ts` 생성 (Student, Teacher, AttendanceRecord 타입)
- [x] `src/lib/sheets.ts` 생성 (Google Sheets API 클라이언트 skeleton)
- [x] `.env.local.example` 생성
- [x] `.gitignore` 정비 (`.env.local`, `docs/legacy-gas.json` 미추적 확인)
- [x] `npm run build` 실행 — 컴파일 오류 없음 확인

# Phase 2 체크리스트 — UI 구현 (출석체크 메인)

- [x] 날짜 유틸 작성 (src/lib/date.ts)
- [x] 그룹핑 유틸 작성 (src/lib/group-members.ts) — 학년→반→이름, 교사팀 순서 정렬
- [x] 더미 데이터 작성 (src/lib/mock-data.ts) — 실제 개인정보 미사용
- [x] MemberCard, SummaryBar, FilterChips, GradeSection 컴포넌트 작성
- [x] Header(layout) 컴포넌트 작성 — 날짜/세션 선택
- [x] 출석체크 메인 페이지(page.tsx) 작성 — 필터 칩, 출석 토글
- [x] "주일 출석부" 티켓/스탬프 컨셉으로 비주얼 리디자인 (frontend-design 스킬)
  - Gowun Batang(제목) + IBM Plex Sans KR(본문) 폰트
  - 크림 페이퍼 / 잉크 네이비 / 테라코타 스탬프 / 틸(교사) / 골드(새친구) 컬러 토큰
  - 티켓 펀치홀(ticket-notch), 도장 애니메이션(stamp-down), 등장 스태거(rise-in), 그레인 텍스처
- [x] npm run build 컴파일 확인
- [x] 브라우저 실행 후 토글/모바일 반응형/섹션별 색상 검증 (스크린샷 + 콘솔 에러 확인)
- [x] 헤더 영역 UX 개선 — 타이틀 분리, 액션 버튼 빈도순 재배치, 새로고침 → 마지막 업데이트 텍스트, lg 기준 반응형 레이아웃
