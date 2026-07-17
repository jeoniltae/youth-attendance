// 스프레드시트 구조 검증 스크립트 (Phase 7 사전 검증 Step 1 / Phase 8-B 실시트 전환 시 재사용)
// - 탭 이름 3개(Students/Teachers/Attendance) 존재 확인
// - 각 시트 헤더를 코드 기대값과 이름·순서 모두 비교
// - 개인정보 보호: 데이터 값은 출력하지 않고 헤더·행 수만 출력
// 실행: node scripts/verify-sheets.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

// .env.local 파싱 (dotenv 없이 — KEY=VALUE, 따옴표 제거, 주석 무시)
function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// 코드가 기대하는 시트 구조 (CLAUDE.md + src 코드 기준)
const EXPECTED = {
  Students: [
    'ID', 'Session', 'Grade', 'Class', 'Name', 'Phone', 'ParentPhone',
    'Address', 'Birthdate', 'School', 'Teacher', 'Notes', '출석률', '세례', 'gender',
  ],
  Teachers: ['ID', 'Session', 'Team', 'Name', 'Phone', 'Address', 'Birthdate', 'Notes', 'Lunar'],
  Attendance: ['Date', 'Session', 'Grade', 'Class', 'StudentID', 'Name', 'Status', 'Timestamp', 'ect', 'Type'],
};

// 컬럼이 없을 때 안내할 조치 방법 (전환 전 사전 점검에서 무엇을 해야 하는지 바로 보이도록)
const REMEDY = {
  Type: 'Attendance J1에 Type 헤더 추가 (수동)',
  Lunar: 'node scripts/add-teacher-lunar-header.mjs 실행',
};

function compareHeaders(sheetName, actual) {
  const expected = EXPECTED[sheetName];
  const problems = [];
  const max = Math.max(expected.length, actual.length);

  for (let i = 0; i < max; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (exp === act) continue;

    if (act === undefined) {
      const remedy = REMEDY[exp];
      problems.push({
        col: i + 1,
        message: `기대 '${exp}' — 시트에 없음${remedy ? ` → ${remedy}` : ''}`,
      });
    } else if (exp === undefined) {
      problems.push({ col: i + 1, message: `코드가 모르는 컬럼 '${act}' 존재` });
    } else {
      problems.push({ col: i + 1, message: `기대 '${exp}' ↔ 실제 '${act}'` });
    }
  }
  return problems;
}

async function main() {
  console.log('=== 스프레드시트 구조 검증 ===\n');

  // 1) 스프레드시트 제목 + 탭 목록
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'properties.title,sheets.properties.title',
  });
  const title = meta.data.properties?.title ?? '(제목 없음)';
  const tabs = (meta.data.sheets ?? []).map((s) => s.properties?.title);
  console.log(`문서 제목: ${title}`);
  console.log(`탭 목록: ${tabs.join(', ')}\n`);

  let hasBlockingIssue = false;

  for (const sheetName of Object.keys(EXPECTED)) {
    console.log(`--- ${sheetName} ---`);
    if (!tabs.includes(sheetName)) {
      console.log(`❌ 탭 '${sheetName}' 없음\n`);
      hasBlockingIssue = true;
      continue;
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const rows = res.data.values ?? [];
    const header = (rows[0] ?? []).map(String);
    const dataRowCount = Math.max(rows.length - 1, 0);

    console.log(`헤더(${header.length}개): ${header.join(' | ')}`);
    console.log(`데이터 행 수: ${dataRowCount}`);

    const problems = compareHeaders(sheetName, header);
    if (problems.length === 0) {
      console.log('✅ 헤더 이름·순서 완전 일치');
    } else {
      for (const p of problems) {
        console.log(`❌ ${p.col}열: ${p.message}`);
        hasBlockingIssue = true;
      }
    }
    console.log('');
  }

  console.log(
    hasBlockingIssue
      ? '결론: ❌ 코드 기대 구조와 불일치 — 위 항목 확인 필요'
      : '결론: ✅ 구조 검증 통과',
  );
  process.exitCode = hasBlockingIssue ? 1 : 0;
}

main().catch((err) => {
  console.error('검증 실패:', err.message);
  process.exitCode = 1;
});
