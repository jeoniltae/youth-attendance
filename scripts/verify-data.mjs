// 데이터 형식 점검 스크립트 (Phase 7 사전 검증 Step 2)
// - 사본 Attendance에 Type 헤더가 없으면 추가 (J1)
// - 코드 매칭 로직에 영향을 주는 데이터 형식을 통계로만 점검
// 개인정보 보호: 이름/연락처/주소/생년월일 등 실제 값은 절대 출력하지 않음
//   (Session/Grade/Class/Status/Team 같은 분류값과 패턴 통계, 예배일자만 출력)
// 실행: node scripts/verify-data.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

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

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return { header: [], rows: [] };
  const [header, ...dataRows] = rows;
  const objects = dataRows.map((row) =>
    header.reduce((acc, key, i) => {
      acc[String(key)] = String(row[i] ?? '');
      return acc;
    }, {}),
  );
  return { header: header.map(String), rows: objects };
}

// 값 분포 집계 (값 자체가 분류값이라 안전한 컬럼 전용)
function distribution(rows, key) {
  const counts = new Map();
  for (const r of rows) {
    const v = r[key] ?? '';
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printDistribution(label, dist, maxItems = 15) {
  const shown = dist.slice(0, maxItems);
  const rest = dist.length - shown.length;
  const parts = shown.map(([v, n]) => `'${v}'×${n}`);
  console.log(`${label}: ${parts.join(', ')}${rest > 0 ? ` … 외 ${rest}종` : ''}`);
}

// 패턴 일치율 (값은 출력하지 않고 개수만)
function patternCheck(label, rows, key, regex, { showMismatch = false } = {}) {
  let ok = 0;
  let empty = 0;
  const mismatches = [];
  for (const r of rows) {
    const v = r[key] ?? '';
    if (v === '') { empty++; continue; }
    if (regex.test(v)) ok++;
    else mismatches.push(v);
  }
  const bad = mismatches.length;
  const mark = bad === 0 ? '✅' : '❌';
  let line = `${mark} ${label}: 일치 ${ok} / 불일치 ${bad} / 빈 값 ${empty}`;
  if (bad > 0 && showMismatch) {
    // 개인정보 아닌 컬럼만 showMismatch 사용 (예: 예배일자)
    line += ` — 불일치 예시: ${[...new Set(mismatches)].slice(0, 5).map((v) => `'${v}'`).join(', ')}`;
  }
  console.log(line);
  return bad;
}

function checkDuplicateIds(label, rows) {
  const counts = new Map();
  for (const r of rows) {
    const id = r.ID ?? '';
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const dups = [...counts.entries()].filter(([, n]) => n > 1);
  if (dups.length === 0) {
    console.log(`✅ ${label} ID 중복 없음`);
    return 0;
  }
  console.log(`❌ ${label} ID 중복 ${dups.length}건: ${dups.map(([id, n]) => `'${id}'×${n}`).join(', ')}`);
  return dups.length;
}

async function ensureTypeHeader() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Attendance!1:1',
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const header = (res.data.values?.[0] ?? []).map(String);
  if (header.includes('Type')) {
    console.log(`Type 헤더: 이미 존재 (${header.indexOf('Type') + 1}열)`);
    return;
  }
  const col = header.length + 1; // 다음 빈 열
  const colLetter = String.fromCharCode(64 + col); // 10열 → 'J' (26열 이하 전제)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Attendance!${colLetter}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Type']] },
  });
  console.log(`Type 헤더: ${colLetter}1에 추가 완료`);
}

async function main() {
  console.log('=== 데이터 형식 점검 ===\n');

  console.log('--- 0) Attendance Type 헤더 ---');
  await ensureTypeHeader();
  console.log('');

  const [students, teachers, attendance, newFamilies] = await Promise.all([
    readSheet('Students'),
    readSheet('Teachers'),
    readSheet('Attendance'),
    readSheet('NewFamilies').catch(() => null),
  ]);

  let issues = 0;

  console.log('--- 1) Students (359행 기대) ---');
  console.log(`행 수: ${students.rows.length}`);
  printDistribution('Session 분포', distribution(students.rows, 'Session'));
  printDistribution('Grade 분포', distribution(students.rows, 'Grade'));
  printDistribution('Class 분포', distribution(students.rows, 'Class'));
  // 실데이터에 공존하는 ID 형식: 레거시 'YY-학년-반-순번', 코드 생성 'YYYY-학년-반-순번',
  // 새친구 'N-YYYY-새가족-순번' — 이 세 형식 외의 이상값만 검출 (형식 통일은 Step 6 결정 사항)
  issues += patternCheck(
    'ID 패턴 (알려진 3개 형식)',
    students.rows,
    'ID',
    /^(\d{2}|\d{4})-[^-]+-[^-]*-\d+$|^[A-Z]-\d{4}-[^-]*-\d+$/,
  );
  issues += patternCheck('Birthdate 형식 (YYYY-MM-DD)', students.rows, 'Birthdate', /^\d{4}-\d{2}-\d{2}$/);
  issues += checkDuplicateIds('Students', students.rows);
  console.log('');

  console.log('--- 2) Teachers (72행 기대) ---');
  console.log(`행 수: ${teachers.rows.length}`);
  printDistribution('Session 분포', distribution(teachers.rows, 'Session'));
  printDistribution('Team 분포', distribution(teachers.rows, 'Team'));
  issues += patternCheck('Birthdate 형식 (YYYY-MM-DD)', teachers.rows, 'Birthdate', /^\d{4}-\d{2}-\d{2}$/);
  issues += checkDuplicateIds('Teachers', teachers.rows);
  console.log('');

  console.log('--- 3) Attendance (4744행 기대) ---');
  console.log(`행 수: ${attendance.rows.length}`);
  printDistribution('Session 분포', distribution(attendance.rows, 'Session'));
  printDistribution('Grade 분포', distribution(attendance.rows, 'Grade'));
  printDistribution('Status 분포', distribution(attendance.rows, 'Status'));
  issues += patternCheck('Date 형식 (YYYY-MM-DD)', attendance.rows, 'Date', /^\d{4}-\d{2}-\d{2}$/, { showMismatch: true });
  // StudentID가 Students/Teachers ID에 존재하는지 (참조 무결성 — 개수만)
  const studentIdSet = new Set(students.rows.map((r) => r.ID));
  const teacherIdSet = new Set(teachers.rows.map((r) => r.ID));
  let refStudent = 0, refTeacher = 0, refOrphan = 0;
  for (const r of attendance.rows) {
    if (studentIdSet.has(r.StudentID)) refStudent++;
    else if (teacherIdSet.has(r.StudentID)) refTeacher++;
    else refOrphan++;
  }
  console.log(`StudentID 참조: 학생 ${refStudent} / 교사 ${refTeacher} / 어느 쪽에도 없음 ${refOrphan}`);
  // 최근 예배일자 5개 (예배일자는 개인정보 아님 — 날짜 매칭 검증용)
  const dates = [...new Set(attendance.rows.map((r) => r.Date))].sort().slice(-5);
  console.log(`최근 출석 기록 날짜 5개: ${dates.join(', ')}`);
  console.log('');

  console.log('--- 4) NewFamilies 탭 (새친구 저장 위치 확인) ---');
  if (newFamilies) {
    console.log(`행 수: ${newFamilies.rows.length}`);
    console.log(`헤더: ${newFamilies.header.join(' | ')}`);
    const gradeInStudents = students.rows.filter((r) => r.Grade === '새친구').length;
    console.log(`Students 시트 내 Grade='새친구' 행 수: ${gradeInStudents}`);
  } else {
    console.log('NewFamilies 탭 읽기 실패 (탭 없음?)');
  }
  console.log('');

  console.log(issues === 0 ? '결론: ✅ 형식 점검 통과' : `결론: ❌ 확인 필요 항목 ${issues}건`);
  process.exitCode = issues === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('점검 실패:', err.message);
  process.exitCode = 1;
});
