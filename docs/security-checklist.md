# 보안 체크리스트

이 저장소는 public으로 운영됩니다. 커밋하기 전에 아래 항목을 확인하세요.

## 매 커밋 전 확인

- [ ] `git status`로 추가되는 파일 목록을 확인했다 (`.env`, `legacy-gas.json`이 포함되어 있지 않은지)
- [ ] 코드, 주석, 테스트 데이터에 실제 학생/교사 이름·전화번호·주소·생년월일을 쓰지 않았다 (더미 데이터 사용)
- [ ] 코드에 실제 스프레드시트 ID, API 키, 비밀번호를 하드코딩하지 않았다
- [ ] 스크린샷이나 README에 실제 데이터가 찍힌 화면을 올리지 않았다

## 프로젝트 세팅 시 1회 확인

- [ ] `.gitignore`에 `.env*`, `docs/legacy-gas.json`이 포함되어 있다
- [ ] `.env.local`을 만들어 실제 값을 채웠고, 이 파일이 git에 추적되지 않는다 (`git status`에 안 보여야 함)
- [ ] Google Service Account의 권한이 해당 스프레드시트 1개로만 제한되어 있다 (전체 Drive 권한 부여하지 않음)
- [ ] 관리자 비밀번호가 충분히 복잡하다 (생일, 전화번호 뒷자리 등 추측 가능한 값 금지)

## 만약 실수로 민감 정보를 커밋했다면

1. 아직 푸시하지 않았다면: `git reset --soft HEAD~1`로 직전 커밋을 취소하고 파일을 `.gitignore`에 추가한 뒤 다시 커밋한다.
2. 이미 푸시했다면: `.gitignore` 추가만으로는 git 히스토리에 남은 내용이 제거되지 않는다. `git filter-repo` 또는 `BFG Repo-Cleaner`로 히스토리에서 완전히 삭제해야 한다.
3. 노출된 값이 비밀번호나 API 키라면: 히스토리 정리와 무관하게 해당 값을 즉시 재발급하거나 변경한다 (Google Cloud Console에서 Service Account 키 재발급, `ADMIN_PASSWORD` 변경).
4. 노출된 값이 학생 개인정보라면: 즉시 비공개 처리하거나 히스토리 정리 후 영향 범위를 확인한다.

## 배포 환경(Vercel) 환경변수 등록

로컬 `.env.local`은 git에 올라가지 않으므로, Vercel 배포 시에는 Vercel 대시보드의 Environment Variables에 동일한 값을 별도로 등록해야 한다.

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`
- `ADMIN_PASSWORD` (/members 관리자 게이트)
- `SESSION_PASSWORD` (/, /history, /birthday, /registry 공개 화면 교사용 게이트)
