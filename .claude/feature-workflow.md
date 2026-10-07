---
plans_dir: docs/plans
design: existing   # 기존 디자인 토큰(paper/ink/stamp/teal/gold/celebrate)·티켓 스타일 유지
test: auto         # 테스트 러너 없음 → 타입체크 + 빌드 + 브라우저 확인으로 대체됨
base_branch: main  # 작업은 dev, Vercel 배포 기준은 main
---

# feature-workflow 프로젝트 설정 — 고등부 전자출석부

<!-- public 저장소다. 비밀값·실제 학생/교사 정보를 이 파일과 docs/plans/ 산출물에 적지 않는다. -->
<!-- 상세 규칙은 CLAUDE.md와 docs/ 문서가 원본이다. 여기에는 "어느 단계에서 무엇을 확인하라"만 적는다. -->

## DEFINE
- 시트 구조(컬럼 추가·변경)가 바뀌는 기능이면 spec "영향 범위"에 바뀌는 시트·컬럼과 **실시트 반영 방법**(`scripts/`의 헤더 추가 스크립트 패턴)을 적는다
- 화면이 늘거나 바뀌면 어느 **인증 게이트**(session / registry / admin) 뒤에 두는지 spec에 적는다 (CLAUDE.md "인증 구조")
- 레거시 동작이 불분명할 때만 `docs/legacy-gas.json`을 참고한다. 실제 값은 spec에 옮기지 않는다

## PLAN
- 마지막 단계에 문서 갱신 작업을 넣는다: `docs/migration-progress.md`, `docs/context-notes.md`, `CLAUDE.md`(폴더 구조·API·화면 표가 바뀌면)
- 환경변수가 늘면 `.env.local.example`·`docs/security-checklist.md`(Vercel 등록 목록) 갱신 작업을 넣는다
- 이 워크플로우의 `plan.md`가 `docs/coding-guidelines.md` 7번의 "계획 + 체크리스트"를 대신한다(`checklist.md`를 따로 만들지 않는다)

## BUILD
- 코딩 규칙: `docs/coding-guidelines.md` (새 파일 상단 한국어 한 줄 주석, 문장 끝 콜론 금지 등)
- Next.js 코드는 `AGENTS.md` 지시대로 `node_modules/next/dist/docs/`의 해당 가이드를 먼저 확인한다
- 데이터 접근은 `src/lib/sheets.ts` 헬퍼, 그룹핑·날짜·연락처는 `src/lib/` 기존 유틸을 먼저 찾아 재사용한다
- 코드·주석·예시 데이터에는 더미 값만 쓴다(`홍길동`, `010-0000-0000`)
- 게이트 화면을 만들거나 고치면 데이터 훅 `enabled`뿐 아니라 **렌더 자체**를 인증 여부로 막는다 (CLAUDE.md ⚠️ 항목)
- **커밋 시점 예외:** `docs/coding-guidelines.md` 9번("논리적 변경이 끝나면 요청 없이 커밋")은 이 워크플로우로 진행하는 기능에는 적용하지 않는다. BUILD 중에는 커밋하지 않고, SHIP 단계에서 사용자 확인 후 커밋한다 (2026-10-02 사용자 결정)

## VERIFY
- 검증 명령: `npx tsc --noEmit` → `npm run build` (테스트·린트 스크립트 없음)
- 화면 확인은 `npm run dev` + 브라우저. **게이트 화면을 건드렸으면** 두 경로를 모두 본다
  1. 주소창으로 직접 진입
  2. 다른 화면에서 데이터를 받은 뒤 이동해 진입 (캐시 누수는 이 경로에서만 드러난다)
- 브라우저 스크린샷에는 실데이터가 찍힐 수 있다. 저장소 안에 저장하지 않고 임시 폴더에만 둔다
- API를 바꿨으면 curl로 응답 형태를 확인한다

## REVIEW
- `docs/security-checklist.md`의 "매 커밋 전 확인" 4항목을 diff와 스테이징 목록에 대조한다
  - 특히 `.env*`, `docs/legacy-gas.json`이 포함되지 않았는지, 실제 이름·연락처·주소·생년월일·시트 ID가 코드·주석·`docs/plans/`에 없는지
- 데이터 API(`/api/*`)에 서버 인증이 없다는 전제(CLAUDE.md "보호 수준은 화면 레벨")를 이번 변경이 악화시키지 않았는지 본다

## SHIP
- `docs/migration-progress.md`에 완료 항목 추가 (무엇을 했고 무엇으로 확인했는지)
- 판단 근거가 있으면 `docs/context-notes.md` **맨 위**(목차 바로 아래)에 `(YYYY-MM-DD)` 날짜를 붙인 섹션 추가 + 목차 갱신
- 폴더 구조·API·화면·환경변수가 바뀌었으면 `CLAUDE.md` 해당 표 갱신
- 커밋 메시지는 기존 기록 형식을 따른다: `feat:`/`fix:`/`docs:` + 한국어 요약 + `-` 항목 나열
