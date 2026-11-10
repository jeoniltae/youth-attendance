// 말씀노트 토큰·기간·일요일 계산 검사 (시트 접근 없음)
// 실행: node scripts/verify-notes-lib.mjs

import assert from 'node:assert/strict';
import { makeClassToken, resolveClassToken } from '../src/lib/notes-token.ts';
import { redactNoteToken } from '../src/lib/analytics.ts';
import { checkableSundays, periodFromKey, periodOfDate, periodsOfYear } from '../src/lib/notes-period.ts';
import { addDays, countSundays, parseInputDate, sundaysThisYear } from '../src/lib/date.ts';

process.env.NOTES_QR_SECRET = 'test-secret';

// 토큰
const a = { session: '오전', grade: '1', class: '2' };
const b = { session: '오전', grade: '1', class: '3' };
const classes = [a, b];
const tokenA = makeClassToken(a.session, a.grade, a.class);
assert.equal(tokenA.length, 16);
assert.equal(tokenA, makeClassToken(a.session, a.grade, a.class));
assert.notEqual(tokenA, makeClassToken(b.session, b.grade, b.class));
assert.deepEqual(resolveClassToken(tokenA, classes), a);
assert.equal(resolveClassToken(`${tokenA.slice(0, 15)}${tokenA[15] === 'A' ? 'B' : 'A'}`, classes), null);
assert.equal(resolveClassToken('short', classes), null);
assert.equal(resolveClassToken('', classes), null);
process.env.NOTES_QR_SECRET = 'other-secret';
assert.equal(resolveClassToken(tokenA, classes), null);

// 기간 경계
const cases = [
  ['2026-01-01', '2026-1'], ['2026-04-30', '2026-1'],
  ['2026-05-01', '2026-2'], ['2026-08-31', '2026-2'],
  ['2026-09-01', '2026-3'], ['2026-12-31', '2026-3'],
];
for (const [date, key] of cases) assert.equal(periodOfDate(date).key, key, date);
assert.equal(periodsOfYear(2026).length, 3);
assert.equal(periodFromKey('2026-3').label, '2026년 3기 (9~12월)');
assert.equal(periodFromKey('2026-3').from, '2026-09-01');
assert.equal(periodFromKey('2026-4'), null);
assert.equal(periodFromKey('x'), null);

// 일요일 수 — 하루씩 세는 방식과 비교
function brute(from, to) {
  let n = 0;
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) n++;
  }
  return n;
}
for (const year of [2025, 2026, 2027, 2028]) {
  const halves = [{ from: `${year}-01-01`, to: `${year}-06-30` }, { from: `${year}-07-01`, to: `${year}-12-31` }];
  for (const p of [...periodsOfYear(year), ...halves]) {
    assert.equal(countSundays(p.from, p.to), brute(p.from, p.to), `${p.from}~${p.to}`);
  }
}
assert.equal(countSundays('2026-05-01', '2026-08-31'), 18);

// 체크 가능 날짜 — 지금 기수 + 새 기수 시작 후 21일(첫날 포함) 동안 같은 해 지난 기수
const window = (today) => checkableSundays(today);
const ends = (list) => [list[0], list.at(-1), list.length];
assert.deepEqual(ends(window('2026-11-08')), ['2026-11-08', '2026-09-06', 10], '3기 진행 중 — 3기만');
assert.deepEqual(ends(window('2026-09-21')), ['2026-09-20', '2026-05-03', 21], '유예 마지막 날 — 2기 전체 포함');
assert.deepEqual(ends(window('2026-09-22')), ['2026-09-20', '2026-09-06', 3], '유예 끝난 다음 날 — 3기만');
assert.deepEqual(ends(window('2026-05-01')), ['2026-04-26', '2026-01-04', 17], '2기 첫날 — 1기 전체');
assert.deepEqual(ends(window('2026-05-22')), ['2026-05-17', '2026-05-03', 3], '2기 22일째 — 2기만');
assert.deepEqual(window('2026-01-10'), ['2026-01-04'], '1기 — 지난해 기수는 유예 없음');
assert.deepEqual(window('2026-01-03'), [], '새해 첫 일요일 전');
assert.ok(!window('2026-11-08').includes('2026-08-30'), '유예 지난 뒤 지난 기수 마지막 주는 빠진다');
assert.deepEqual(window('2027-01-05'), ['2027-01-03'], '1월 — 지난해 3기 유예 없음');

// 리뷰 전 방식(올해 지난 일요일 목록을 시작일로 거르기)과 3년 동안 매일 같은 결과인지
for (let day = '2026-01-01'; day <= '2028-12-31'; day = addDays(day, 1)) {
  const result = window(day);
  const earliest = result.at(-1) ?? '9999';
  const expected = sundaysThisYear(parseInputDate(day)).filter((d) => d >= earliest);
  assert.deepEqual(result, expected, day);
  const month = Number(day.slice(5, 7));
  const periodStart = `${day.slice(0, 4)}-${String(Math.floor((month - 1) / 4) * 4 + 1).padStart(2, '0')}-01`;
  if (addDays(periodStart, 20) < day) assert.ok(result.every((d) => d >= periodStart), `유예 뒤 지난 기수 없음 ${day}`);
}

// 분석 전송 주소에서 토큰 가리기
const noteUrl = 'https://example.com/notes/c/abc_DEF-123';
assert.equal(redactNoteToken(noteUrl), 'https://example.com/notes/c/[token]');
assert.equal(redactNoteToken(`${noteUrl}?a=1#b`), 'https://example.com/notes/c/[token]?a=1#b');
assert.equal(redactNoteToken('https://example.com/notes/summary'), 'https://example.com/notes/summary');

console.log('통과: 토큰·기간 경계·일요일 수·체크 가능 날짜·분석 주소');
