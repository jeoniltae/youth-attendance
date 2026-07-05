// 쓰기 API 검증 스크립트 (Phase 7 사전 검증 Step 4) — 사본 시트 전용!
// 시나리오:
//   1) 출석 토글 왕복 (학생) — 기록 없는 날짜에 추가→시트 확인→삭제→시트 확인
//   2) 출석 토글 왕복 (교사) — Type='teacher' 기록 확인
//   3) 레거시 행(Type 빈 값) 토글 — 기존 행 삭제→재추가로 원상 복구
//   4) 학생 CRUD — POST(ID 생성)→PUT(수정)→DELETE, 더미 데이터(홍길동)만 사용
//   5) 교사 CRUD — 동일 패턴
//   6) 최종 무결성 — 세 시트의 행 수·ID 집합이 시작 시점과 동일한지
// 개인정보 보호: 실제 학생/교사의 이름·ID는 출력하지 않음 (더미 데이터만 출력)
// 실행: (dev 서버 실행 상태에서) node scripts/verify-write-api.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const BASE = 'http://localhost:3000';
const TEST_DATE = '2026-07-05'; // 출석 기록이 없는 미래 주일

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
function assert(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

const attKey = (r) => `${r.Date}|${r.Session}|${r.StudentID}`;
const multiset = (arr) => {
  const m = new Map();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
const sameMultiset = (a, b) => {
  if (a.size !== b.size) return false;
  for (const [k, n] of a) if (b.get(k) !== n) return false;
  return true;
};

async function main() {
  console.log('=== 쓰기 API 검증 (사본 시트) ===\n');

  // 시작 스냅샷
  const [students0, teachers0, attendance0] = await Promise.all([
    readSheet('Students'), readSheet('Teachers'), readSheet('Attendance'),
  ]);
  const snapshot = {
    studentIds: multiset(students0.map((r) => r.ID)),
    teacherIds: multiset(teachers0.map((r) => r.ID)),
    attKeys: multiset(attendance0.map(attKey)),
  };
  console.log(`시작 스냅샷: Students ${students0.length} / Teachers ${teachers0.length} / Attendance ${attendance0.length}\n`);

  const preExisting = attendance0.filter((r) => r.Date === TEST_DATE).length;
  if (preExisting > 0) {
    console.log(`❌ 테스트 날짜 ${TEST_DATE}에 이미 기록 ${preExisting}건 존재 — 다른 날짜로 변경 필요`);
    process.exitCode = 1;
    return;
  }

  // 실데이터에서 테스트 대상 선정 (이름·ID는 출력하지 않음)
  const testStudent = students0.find((r) => r.ID && r.Name && r.Grade && r.Grade !== '새친구' && r.Session === '오전');
  const testTeacher = teachers0.find((r) => r.ID && r.Name && r.Session === '오전');

  // --- 1) 학생 출석 토글 왕복 ---
  console.log(`--- 1) 학생 출석 토글 왕복 (${TEST_DATE}, 오전) ---`);
  let res = await api('POST', '/api/attendance', {
    date: TEST_DATE, session: '오전', grade: testStudent.Grade, class: testStudent.Class,
    studentId: testStudent.ID, name: testStudent.Name, type: 'student',
  });
  assert('토글 1회차 → 출석', res.status === 200 && res.data?.status === '출석', `HTTP ${res.status}`);

  let att = await readSheet('Attendance');
  let added = att.filter((r) => r.Date === TEST_DATE && r.StudentID === testStudent.ID);
  assert('시트에 행 추가됨', added.length === 1);
  assert("추가 행 Type='student'", added[0]?.Type === 'student');
  assert("추가 행 Status='출석'", added[0]?.Status === '출석');

  res = await api('POST', '/api/attendance', {
    date: TEST_DATE, session: '오전', grade: testStudent.Grade, class: testStudent.Class,
    studentId: testStudent.ID, name: testStudent.Name, type: 'student',
  });
  assert('토글 2회차 → 결석', res.status === 200 && res.data?.status === '결석', `HTTP ${res.status}`);
  att = await readSheet('Attendance');
  assert('시트에서 행 삭제됨', att.filter((r) => r.Date === TEST_DATE && r.StudentID === testStudent.ID).length === 0);
  console.log('');

  // --- 2) 교사 출석 토글 왕복 ---
  console.log(`--- 2) 교사 출석 토글 왕복 (${TEST_DATE}, 오전) ---`);
  const teacherPayload = {
    date: TEST_DATE, session: '오전', grade: '', class: '',
    studentId: testTeacher.ID, name: testTeacher.Name, type: 'teacher',
  };
  res = await api('POST', '/api/attendance', teacherPayload);
  assert('토글 1회차 → 출석', res.status === 200 && res.data?.status === '출석', `HTTP ${res.status}`);
  att = await readSheet('Attendance');
  added = att.filter((r) => r.Date === TEST_DATE && r.StudentID === testTeacher.ID);
  assert('시트에 행 추가됨', added.length === 1);
  assert("추가 행 Type='teacher'", added[0]?.Type === 'teacher');

  res = await api('POST', '/api/attendance', teacherPayload);
  assert('토글 2회차 → 결석', res.status === 200 && res.data?.status === '결석', `HTTP ${res.status}`);
  att = await readSheet('Attendance');
  assert('시트에서 행 삭제됨', att.filter((r) => r.Date === TEST_DATE && r.StudentID === testTeacher.ID).length === 0);
  console.log('');

  // --- 3) 레거시 행(Type 빈 값) 토글 → 재추가로 복구 ---
  console.log('--- 3) 레거시 행(Type 빈 값) 토글 왕복 ---');
  const recentDate = [...new Set(attendance0.map((r) => r.Date))].sort().at(-1);
  const studentIdSet = new Set(students0.map((r) => r.ID));
  const legacyRow = attendance0.find(
    (r) => r.Date === recentDate && !r.Type && !r.ect && studentIdSet.has(r.StudentID),
  );
  if (!legacyRow) {
    assert('레거시 대상 행 선정', false, '조건에 맞는 행 없음');
  } else {
    console.log(`  대상: ${recentDate} ${legacyRow.Session} 학생 1명 (레거시 기록)`);
    const legacyPayload = {
      date: legacyRow.Date, session: legacyRow.Session, grade: legacyRow.Grade,
      class: legacyRow.Class, studentId: legacyRow.StudentID, name: legacyRow.Name, type: 'student',
    };
    res = await api('POST', '/api/attendance', legacyPayload);
    assert('토글 → 결석 (Type 없이도 행 찾음)', res.status === 200 && res.data?.status === '결석', `HTTP ${res.status}`);
    att = await readSheet('Attendance');
    assert('시트에서 삭제 확인', att.filter((r) => attKey(r) === attKey(legacyRow)).length === 0);

    res = await api('POST', '/api/attendance', legacyPayload);
    assert('재토글 → 출석 (복구)', res.status === 200 && res.data?.status === '출석', `HTTP ${res.status}`);
    att = await readSheet('Attendance');
    const restored = att.filter((r) => attKey(r) === attKey(legacyRow));
    assert('시트에 복구 확인', restored.length === 1, '(Timestamp 갱신·Type 채워짐은 정상)');
  }
  console.log('');

  // --- 4) 학생 CRUD (더미 데이터) ---
  console.log('--- 4) 학생 CRUD (더미: 홍길동) ---');
  const dummyStudent = {
    session: '오전', grade: '1', class: '99', name: '홍길동',
    phone: '010-0000-0000', parentPhone: '010-1111-1111', address: '테스트시 테스트구',
    birthdate: '2010-01-01', school: '테스트고', teacher: '테스트교사',
    notes: '쓰기 검증용 더미', attendanceRate: '', baptism: '', gender: '남',
  };
  res = await api('POST', '/api/students', dummyStudent);
  const newId = res.data?.student?.id;
  assert('POST 201 + ID 생성', res.status === 201 && !!newId, `id=${newId}`);
  assert('ID 형식 (2026-1-99-NNN)', /^2026-1-99-\d{3}$/.test(newId ?? ''));

  let sRows = await readSheet('Students');
  let found = sRows.find((r) => r.ID === newId);
  assert('시트에 행 추가됨', !!found);
  assert('이름/학년/반 저장 확인', found?.Name === '홍길동' && found?.Grade === '1' && found?.Class === '99');

  res = await api('PUT', `/api/students/${encodeURIComponent(newId)}`, {
    ...dummyStudent, id: newId, notes: '수정된 더미', school: '수정고',
  });
  assert('PUT 200', res.status === 200, `HTTP ${res.status}`);
  sRows = await readSheet('Students');
  found = sRows.find((r) => r.ID === newId);
  assert('수정 반영 확인', found?.Notes === '수정된 더미' && found?.School === '수정고');
  assert('다른 필드 보존 확인', found?.Name === '홍길동' && found?.Phone === '010-0000-0000');

  res = await api('DELETE', `/api/students/${encodeURIComponent(newId)}`);
  assert('DELETE 200', res.status === 200, `HTTP ${res.status}`);
  sRows = await readSheet('Students');
  assert('시트에서 삭제 확인', !sRows.find((r) => r.ID === newId));
  console.log('');

  // --- 5) 교사 CRUD (더미 데이터) ---
  console.log('--- 5) 교사 CRUD (더미: 홍길동) ---');
  const dummyTeacher = {
    session: '오전', team: '총무팀', name: '홍길동', phone: '010-0000-0000',
    address: '테스트시', birthdate: '1990-01-01', notes: '쓰기 검증용 더미',
  };
  res = await api('POST', '/api/teachers', dummyTeacher);
  const newTid = res.data?.teacher?.id;
  assert('POST 201 + ID 생성', res.status === 201 && !!newTid, `id=${newTid}`);

  let tRows = await readSheet('Teachers');
  let tFound = tRows.find((r) => r.ID === newTid);
  assert('시트에 행 추가됨', !!tFound);
  assert('이름/팀 저장 확인', tFound?.Name === '홍길동' && tFound?.Team === '총무팀');

  res = await api('PUT', `/api/teachers/${encodeURIComponent(newTid)}`, {
    ...dummyTeacher, id: newTid, notes: '수정된 더미', team: '예배지원팀',
  });
  assert('PUT 200', res.status === 200, `HTTP ${res.status}`);
  tRows = await readSheet('Teachers');
  tFound = tRows.find((r) => r.ID === newTid);
  assert('수정 반영 확인', tFound?.Notes === '수정된 더미' && tFound?.Team === '예배지원팀');

  res = await api('DELETE', `/api/teachers/${encodeURIComponent(newTid)}`);
  assert('DELETE 200', res.status === 200, `HTTP ${res.status}`);
  tRows = await readSheet('Teachers');
  assert('시트에서 삭제 확인', !tRows.find((r) => r.ID === newTid));
  console.log('');

  // --- 6) 최종 무결성 — 시작 스냅샷과 비교 ---
  console.log('--- 6) 최종 무결성 (시작 스냅샷 대조) ---');
  const [studentsF, teachersF, attendanceF] = await Promise.all([
    readSheet('Students'), readSheet('Teachers'), readSheet('Attendance'),
  ]);
  assert('Students 행 수·ID 집합 동일', studentsF.length === students0.length && sameMultiset(multiset(studentsF.map((r) => r.ID)), snapshot.studentIds));
  assert('Teachers 행 수·ID 집합 동일', teachersF.length === teachers0.length && sameMultiset(multiset(teachersF.map((r) => r.ID)), snapshot.teacherIds));
  assert('Attendance 행 수·키 집합 동일', attendanceF.length === attendance0.length && sameMultiset(multiset(attendanceF.map(attKey)), snapshot.attKeys));

  console.log(`\n결론: ${failures === 0 ? '✅ 쓰기 API 검증 통과 (시트 원상 복구 확인)' : `❌ 실패 ${failures}건`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('검증 실패:', err.message);
  process.exitCode = 1;
});
