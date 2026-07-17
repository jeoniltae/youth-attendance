// NewFamilies → Students 마이그레이션 (Phase 7 사전 검증 Step 2)
// 새 앱은 새친구를 Students 시트의 Grade='새친구' 행으로 처리하므로,
// 레거시 NewFamilies 탭의 새친구를 Students로 복사한다.
// - 멱등: 이미 Students에 같은 ID가 있으면 건너뜀 (등반한 새친구 포함)
// - 동일인 중복 방지: ID가 달라도 이름+생년월일이 같은 학생이 이미 있으면 건너뜀
//   (등반하면서 새 학생 ID를 받았는데 NewFamilies 행이 남아 있는 경우 —
//    2026-07-17 실시트 전환 시 이 경우로 같은 사람이 새친구로 중복 등록된 사고가 있었음)
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
  return dataRows.map((row, idx) => {
    const obj = header.reduce((acc, key, i) => {
      acc[String(key)] = String(row[i] ?? '').trim();
      return acc;
    }, {});
    obj.__row = idx + 2; // 시트 행 번호 (1행은 헤더) — 건너뛴 행을 시트에서 찾기 위함
    return obj;
  });
}

// 동일인 판정 키: 이름+생년월일.
// 이름만으로는 판정하지 않는다 — 실데이터에 동명이인이 실제로 여러 쌍 존재하므로
// 이름만 비교하면 서로 다른 사람을 같은 사람으로 보고 누락시킬 위험이 있다.
// 따라서 생년월일이 비어 있으면 판정을 포기하고(=건너뛰지 않고) 이전한다.
function personKey(r) {
  return r.Name && r.Birthdate ? `${r.Name}|${r.Birthdate}` : null;
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
  const existingPeople = new Set(students.map(personKey).filter(Boolean));

  let skippedExisting = 0;
  let skippedNoId = 0;
  const skippedSamePerson = [];
  const toMigrate = [];
  for (const nf of newFamilies) {
    if (!nf.ID) { skippedNoId++; continue; }
    if (existingIds.has(nf.ID)) { skippedExisting++; continue; }
    // 등반하면서 새 학생 ID를 받았지만 NewFamilies 행이 남아 있는 경우 —
    // ID가 달라 위 검사를 통과하므로 같은 사람이 '새친구'로 중복 등록된다.
    const key = personKey(nf);
    if (key && existingPeople.has(key)) { skippedSamePerson.push(nf.__row); continue; }
    toMigrate.push(toStudentRow(nf));
  }

  console.log(`NewFamilies 전체: ${newFamilies.length}건`);
  console.log(`이미 Students에 존재(ID 동일): ${skippedExisting}건 — 건너뜀`);
  console.log(
    `이미 Students에 존재(ID는 다르나 이름+생년월일 동일): ${skippedSamePerson.length}건 — 건너뜀` +
      (skippedSamePerson.length ? ` → NewFamilies ${skippedSamePerson.join(', ')}행` : ''),
  );
  if (skippedSamePerson.length) {
    console.log('  ※ 등반 후 NewFamilies 행이 정리되지 않았을 가능성 — 시트에서 확인 권장');
  }
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
