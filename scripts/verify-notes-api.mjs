// 말씀노트 API 검사 — 더미 학생 2명을 잠깐 만들어 그들로만 쓰기를 확인하고 끝에 삭제한다.
// 실제 학생 행은 건드리지 않고, 출력에도 실제 이름·토큰을 남기지 않는다.
// 실행: (dev 서버 실행 상태에서) node scripts/verify-notes-api.mjs

import assert from 'node:assert/strict';
import { google } from 'googleapis';
import { makeClassToken } from '../src/lib/notes-token.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));

const BASE = process.argv[2] ?? 'http://localhost:3000';
const DATE = '2026-03-01'; // 지나간 일요일
const DATE2 = '2026-03-08';
const PERIOD = '2026-1';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function sheetRows(tab) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: tab,
  });
  const [header, ...rows] = res.data.values ?? [];
  return rows.map((row) => Object.fromEntries(header.map((h, i) => [h, row[i] ?? ''])));
}

const noteRows = async (id) => (await sheetRows('SermonNotes')).filter((r) => r.StudentID === id);

function post(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createDummy(name, klass) {
  const res = await post('/api/students', {
    session: '오전', grade: '1', class: klass, name,
    phone: '010-0000-0000', parentPhone: '', address: '', birthdate: '',
    school: '', teacher: '', notes: '', attendanceRate: '', baptism: '', gender: '',
  });
  assert.ok(res.ok, `더미 등록 실패 ${res.status}`);
  return (await res.json()).student.id;
}

const summary = async () => (await fetch(`${BASE}/api/notes/summary?period=${PERIOD}`)).json();
const created = [];

async function main() {
  const idA = await createDummy('홍길동', '99');
  created.push(idA);
  const idB = await createDummy('김철수', '98');
  created.push(idB);
  const token = makeClassToken('오전', '1', '99');
  const save = (over) => post('/api/notes/class', { token, date: DATE, studentId: idA, status: '작성', ...over });

  // 토큰 조회 — 그 반 학생만, 이름 외 개인정보 없음
  const res = await fetch(`${BASE}/api/notes/class?token=${token}&date=${DATE}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.students.map((s) => s.id), [idA]);
  assert.deepEqual(Object.keys(body.students[0]).sort(), ['id', 'name', 'present', 'written']);
  assert.deepEqual(Object.keys(body).sort(), ['class', 'grade', 'session', 'students']);
  assert.ok(!JSON.stringify(body).includes('010-'), '응답에 전화번호');
  console.log('✅ 토큰 조회: 그 반만, 이름 외 개인정보 없음');

  // 거부
  assert.equal((await fetch(`${BASE}/api/notes/class?token=AAAAAAAAAAAAAAAA&date=${DATE}`)).status, 404);
  assert.equal((await save({ token: 'AAAAAAAAAAAAAAAA' })).status, 404);
  assert.equal((await save({ studentId: idB })).status, 403);
  console.log('✅ 잘못된 토큰 404, 다른 반 학생 403');

  for (const date of ['2026-03-02', '2099-01-04', '2025-12-28', '2026-3-1', 'x']) {
    assert.equal((await save({ date })).status, 400, date);
  }
  assert.equal((await fetch(`${BASE}/api/notes/class?token=${token}&date=2026-03-02`)).status, 400);
  assert.equal((await save({ status: '결석' })).status, 400);
  assert.equal((await noteRows(idA)).length, 0, '거부된 요청이 행을 남김');
  console.log('✅ 평일·미래·지난해·잘못된 형식 400');

  // 멱등
  assert.equal((await save()).status, 200);
  assert.equal((await save()).status, 200);
  assert.equal((await noteRows(idA)).length, 1);
  console.log('✅ 같은 요청 2회 → 행 1개');

  // 동시 저장 중복 — 행을 직접 만들어 재현
  const [row] = await noteRows(idA);
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'SermonNotes',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [Object.values(row)] },
  });
  assert.equal((await noteRows(idA)).length, 2);
  const s1 = await summary();
  assert.equal(s1.sundays, 17);
  assert.equal(s1.students.find((s) => s.id === idA).count, 1);
  assert.equal(s1.students[0].count >= 1, true, '횟수 내림차순');
  assert.ok(!s1.students.some((s) => s.grade === '새친구'), '집계에 새친구');
  assert.equal((await save({ status: '미작성' })).status, 200);
  assert.equal((await noteRows(idA)).length, 0);
  assert.equal((await save({ status: '미작성' })).status, 200);
  console.log('✅ 중복 행도 1회 집계, 해제 시 모두 삭제, 분모 17, 집계에 새친구 없음');

  // 동시 해제 — 행 번호가 밀리면 남의 기록이 지워진다. B의 다른 날짜 기록은 남아야 한다
  const saveB = (over) => post('/api/notes/class', { token: makeClassToken('오전', '1', '98'), date: DATE, studentId: idB, status: '작성', ...over });
  assert.equal((await save()).status, 200);
  assert.equal((await saveB()).status, 200);
  assert.equal((await saveB({ date: DATE2 })).status, 200);
  const results = await Promise.all([save({ status: '미작성' }), saveB({ status: '미작성' })]);
  assert.deepEqual(results.map((r) => r.status), [200, 200]);
  assert.equal((await noteRows(idA)).length, 0);
  assert.deepEqual((await noteRows(idB)).map((r) => r.Date), [DATE2]);
  assert.equal((await saveB({ date: DATE2, status: '미작성' })).status, 200);
  console.log('✅ 동시 해제해도 다른 기록 유지');

  // 삭제 cascade — A만 지우고 B의 기록은 남아야 한다
  const tokenB = makeClassToken('오전', '1', '98');
  assert.equal((await save()).status, 200);
  assert.equal((await post('/api/notes/class', { token: tokenB, date: DATE, studentId: idB, status: '작성' })).status, 200);
  for (const [id, klass, name] of [[idA, '99', '홍길동'], [idB, '98', '김철수']]) {
    const r = await post('/api/attendance', {
      date: DATE, session: '오전', grade: '1', class: klass, studentId: id, name, type: 'student', status: '출석',
    });
    assert.ok(r.ok);
  }
  assert.equal((await fetch(`${BASE}/api/students/${idA}`, { method: 'DELETE' })).status, 200);
  created.shift();
  assert.equal((await noteRows(idA)).length, 0);
  assert.equal((await sheetRows('Attendance')).filter((r) => r.StudentID === idA).length, 0);
  assert.equal((await noteRows(idB)).length, 1);
  assert.equal((await sheetRows('Attendance')).filter((r) => r.StudentID === idB).length, 1);
  console.log('✅ 학생 삭제 시 출석·말씀노트 삭제, 다른 학생 기록 유지');
}

async function cleanup() {
  for (const id of created) await fetch(`${BASE}/api/students/${id}`, { method: 'DELETE' });
  const [students, notes, attendance] = await Promise.all(['Students', 'SermonNotes', 'Attendance'].map(sheetRows));
  const left = (rows) => rows.filter((r) => /^20\d\d-1-9[89]-/.test(r.ID ?? r.StudentID)).length;
  console.log(`정리 후 잔존 더미 행: Students ${left(students)}, SermonNotes ${left(notes)}, Attendance ${left(attendance)}`);
}

main()
  .then(() => console.log('결론: ✅ 통과'))
  .catch((err) => {
    console.error('결론: ❌', err.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
