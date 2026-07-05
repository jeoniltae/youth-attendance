// NewFamilies → Students 마이그레이션 (Phase 7 사전 검증 Step 2)
// 새 앱은 새친구를 Students 시트의 Grade='새친구' 행으로 처리하므로,
// 레거시 NewFamilies 탭의 새친구를 Students로 복사한다.
// - 멱등: 이미 Students에 같은 ID가 있으면 건너뜀 (등반한 새친구 포함)
// - NewFamilies 탭 자체는 수정하지 않음 (레거시 GAS 병행 운영 보존)
// - 개인정보 보호: 이름 등 실제 값은 출력하지 않고 건수만 출력
// 실행: node scripts/migrate-newfamilies.mjs
//
// 컬럼 매핑 (NewFamilies → Students):
//   ID→ID(유지), Session→Session, '새친구'→Grade, ''→Class, Name→Name,
//   StudentPhone→Phone, ParentPhone→ParentPhone, Address→Address,
//   Birthdate→Birthdate, School→School, ClassTeacher→Teacher,
//   (본래학년/등록일/인도자/보호자 등 잔여 필드)→Notes, ''→출석률,
//   BaptismStatus→세례, Gender→gender

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const env = loadEnvLocal();
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  return dataRows.map((row) =>
    header.reduce((acc, key, i) => {
      acc[String(key)] = String(row[i] ?? '');
      return acc;
    }, {}),
  );
}

function buildNotes(nf) {
  const parts = [];
  if (nf.Grade) parts.push(`본래학년: ${nf.Grade}`);
  if (nf.EnrollmentDate) parts.push(`등록일: ${nf.EnrollmentDate}`);
  if (nf.Introducer) parts.push(`인도자: ${nf.Introducer}`);
  if (nf.GuardianName) parts.push(`보호자: ${nf.GuardianName}`);
  if (nf.FutureGoal) parts.push(`장래희망: ${nf.FutureGoal}`);
  if (nf.Hobbies) parts.push(`취미: ${nf.Hobbies}`);
  if (nf.Personality) parts.push(`성격: ${nf.Personality}`);
  if (nf.PrayerTopics) parts.push(`기도제목: ${nf.PrayerTopics}`);
  return parts.join(' / ');
}

// Students 컬럼 순서: ID, Session, Grade, Class, Name, Phone, ParentPhone,
// Address, Birthdate, School, Teacher, Notes, 출석률, 세례, gender
function toStudentRow(nf) {
  return [
    nf.ID,
    nf.Session,
    '새친구',
    '',
    nf.Name,
    nf.StudentPhone ?? '',
    nf.ParentPhone ?? '',
    nf.Address ?? '',
    nf.Birthdate ?? '',
    nf.School ?? '',
    nf.ClassTeacher ?? '',
    buildNotes(nf),
    '',
    nf.BaptismStatus ?? '',
    nf.Gender ?? '',
  ];
}

async function main() {
  console.log('=== NewFamilies → Students 마이그레이션 ===\n');

  const [students, newFamilies] = await Promise.all([
    readSheet('Students'),
    readSheet('NewFamilies'),
  ]);
  const existingIds = new Set(students.map((r) => r.ID).filter(Boolean));

  let skippedExisting = 0;
  let skippedNoId = 0;
  const toMigrate = [];
  for (const nf of newFamilies) {
    if (!nf.ID) { skippedNoId++; continue; }
    if (existingIds.has(nf.ID)) { skippedExisting++; continue; }
    toMigrate.push(toStudentRow(nf));
  }

  console.log(`NewFamilies 전체: ${newFamilies.length}건`);
  console.log(`이미 Students에 존재(등반 등): ${skippedExisting}건 — 건너뜀`);
  console.log(`ID 없는 행: ${skippedNoId}건 — 건너뜀 (시트에서 수동 확인 필요)`);
  console.log(`마이그레이션 대상: ${toMigrate.length}건`);

  if (toMigrate.length === 0) {
    console.log('\n추가할 행 없음 — 종료');
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
    range: 'Students',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: toMigrate },
  });
  console.log(`\n✅ Students 시트에 ${toMigrate.length}행 추가 완료 (Grade='새친구')`);
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err.message);
  process.exitCode = 1;
});
