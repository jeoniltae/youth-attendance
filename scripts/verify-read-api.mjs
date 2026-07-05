// 읽기 API 검증 스크립트 (Phase 7 사전 검증 Step 3)
// - dev 서버(localhost:3000)의 GET 엔드포인트를 호출하고, 같은 데이터를 Sheets API로 직접 읽어 대조
// - 개인정보 보호: 실제 값은 출력하지 않고 건수·응답시간·통계 수치만 출력
// 실행: (dev 서버 실행 상태에서) node scripts/verify-read-api.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const BASE = 'http://localhost:3000';

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

let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: API ${actual} / 시트 ${expected}`);
}

async function callApi(path) {
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`);
  const ms = Date.now() - start;
  if (!res.ok) {
    failures++;
    console.log(`  ❌ ${path} → HTTP ${res.status} (${ms}ms)`);
    return { data: null, ms };
  }
  return { data: await res.json(), ms };
}

const enc = encodeURIComponent;

async function main() {
  console.log('=== 읽기 API 검증 (시트 직접 대조) ===\n');

  const [students, teachers, attendance] = await Promise.all([
    readSheet('Students'),
    readSheet('Teachers'),
    readSheet('Attendance'),
  ]);

  // 최근 출석 기록이 있는 날짜 (예배일)
  const recentDate = [...new Set(attendance.map((r) => r.Date))].sort().at(-1);
  console.log(`대조 기준: Students ${students.length}행, Teachers ${teachers.length}행, Attendance ${attendance.length}행, 최근 예배일 ${recentDate}\n`);

  for (const session of ['오전', '오후']) {
    const sStudents = students.filter((r) => r.Session === session).length;
    const sTeachers = teachers.filter((r) => r.Session === session).length;

    console.log(`--- 세션: ${session} ---`);

    const roster = await callApi(`/api/roster?session=${enc(session)}`);
    if (roster.data) {
      check(`roster 학생 수 (${roster.ms}ms)`, roster.data.students.length, sStudents);
      check('roster 교사 수', roster.data.teachers.length, sTeachers);
    }

    const st = await callApi(`/api/students?session=${enc(session)}`);
    if (st.data) check(`students 수 (${st.ms}ms)`, st.data.students.length, sStudents);

    const te = await callApi(`/api/teachers?session=${enc(session)}`);
    if (te.data) check(`teachers 수 (${te.ms}ms)`, te.data.teachers.length, sTeachers);

    const bd = await callApi(`/api/birthdays?session=${enc(session)}`);
    if (bd.data) {
      check(`birthdays 학생 수 (${bd.ms}ms)`, bd.data.students.length, sStudents);
      check('birthdays 교사 수', bd.data.teachers.length, sTeachers);
    }

    const sAtt = attendance.filter(
      (r) => r.Date === recentDate && r.Session === session && r.Status === '출석',
    ).length;
    const att = await callApi(`/api/attendance?date=${recentDate}&session=${enc(session)}`);
    if (att.data) check(`attendance ${recentDate} 출석 수 (${att.ms}ms)`, att.data.studentIds.length, sAtt);

    const stats = await callApi(`/api/stats?session=${enc(session)}`);
    if (stats.data) {
      const d = stats.data;
      console.log(`  ℹ️ stats (${stats.ms}ms): 주 수 ${d.weeks}, 전체 ${d.overall.rate}% (${d.overall.attended}/${d.overall.total})`);
      console.log(`     1학년 ${d.grade1.rate}% (재적 ${d.grade1.count}) / 2학년 ${d.grade2.rate}% (${d.grade2.count}) / 3학년 ${d.grade3.rate}% (${d.grade3.count}) / 교사 ${d.teachers.rate}% (${d.teachers.count})`);
      if (d.teachers.attended === 0) {
        failures++;
        console.log('  ❌ stats 교사 출석 0건 — 레거시 행 교사 판별 실패 의심');
      } else {
        console.log(`  ✅ stats 교사 출석 ${d.teachers.attended}건 집계됨 (레거시 행 판별 정상)`);
      }
    }
    console.log('');
  }

  // 필드 매핑 스팟체크: roster 학생 1명의 필드가 전부 존재하는지 (값 자체는 비출력)
  const roster = await callApi(`/api/roster?session=${enc('오전')}`);
  if (roster.data) {
    const sample = roster.data.students[0] ?? {};
    const requiredKeys = ['id', 'session', 'grade', 'class', 'name', 'phone', 'parentPhone', 'address', 'birthdate', 'school', 'teacher', 'notes', 'attendanceRate', 'baptism', 'gender'];
    const missing = requiredKeys.filter((k) => !(k in sample));
    console.log(missing.length === 0
      ? '✅ 학생 필드 매핑: 15개 키 전부 존재'
      : `❌ 학생 필드 누락: ${missing.join(', ')}`);
    if (missing.length > 0) failures++;

    const tSample = roster.data.teachers[0] ?? {};
    const tKeys = ['id', 'session', 'team', 'name', 'phone', 'address', 'birthdate', 'notes'];
    const tMissing = tKeys.filter((k) => !(k in tSample));
    console.log(tMissing.length === 0
      ? '✅ 교사 필드 매핑: 8개 키 전부 존재'
      : `❌ 교사 필드 누락: ${tMissing.join(', ')}`);
    if (tMissing.length > 0) failures++;
  }

  console.log(`\n결론: ${failures === 0 ? '✅ 읽기 API 검증 통과' : `❌ 불일치 ${failures}건`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('검증 실패:', err.message);
  process.exitCode = 1;
});
