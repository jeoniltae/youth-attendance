// 말씀노트 토큰·기간·일요일 계산 검사 (시트 접근 없음)
// 실행: node scripts/verify-notes-lib.mjs

import assert from 'node:assert/strict';
import { makeClassToken, resolveClassToken } from '../src/lib/notes-token.ts';
import { redactNoteToken } from '../src/lib/analytics.ts';
import { periodFromKey, periodOfDate, periodsOfYear } from '../src/lib/notes-period.ts';
import { countSundays } from '../src/lib/date.ts';

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

// 분석 전송 주소에서 토큰 가리기
const noteUrl = 'https://example.com/notes/c/abc_DEF-123';
assert.equal(redactNoteToken(noteUrl), 'https://example.com/notes/c/[token]');
assert.equal(redactNoteToken(`${noteUrl}?a=1#b`), 'https://example.com/notes/c/[token]?a=1#b');
assert.equal(redactNoteToken('https://example.com/notes/summary'), 'https://example.com/notes/summary');

console.log('통과: 토큰·기간 경계·일요일 수·분석 주소');
