// 말씀노트 QR 링크용 반별 비밀 토큰 — HMAC으로 계산하므로 토큰을 어디에도 저장하지 않는다

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ClassKey {
  session: string;
  grade: string;
  class: string;
}

// 말씀노트 대상 학생인가 — 새친구·반이 비어 있는 학생은 반 QR이 없어 기록하지 않는다
export function isNoteTarget(row: Record<string, string>): boolean {
  return Boolean(row.Session && row.Class) && row.Grade !== '새친구';
}

export function makeClassToken(session: string, grade: string, klass: string): string {
  const secret = process.env.NOTES_QR_SECRET;
  if (!secret) throw new Error('NOTES_QR_SECRET이 설정되지 않았습니다');
  return createHmac('sha256', secret)
    .update(`${session}-${grade}-${klass}`)
    .digest('base64url')
    .slice(0, 16);
}

// 존재하는 반 목록에서 토큰이 가리키는 반을 찾는다. 없으면 null
export function resolveClassToken(token: string, classes: ClassKey[]): ClassKey | null {
  const given = Buffer.from(token);
  return (
    classes.find((c) => {
      const expected = Buffer.from(makeClassToken(c.session, c.grade, c.class));
      return given.length === expected.length && timingSafeEqual(given, expected);
    }) ?? null
  );
}
