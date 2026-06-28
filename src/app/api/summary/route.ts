// 요약 통계 — 날짜+세션 기준 전체/출석/결석/출석률 조회

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';
import type { Session } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  const session = request.nextUrl.searchParams.get('session');

  if (!date || !session) {
    return NextResponse.json({ error: '날짜와 세션은 필수입니다' }, { status: 400 });
  }
  if (!SESSIONS.includes(session as Session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const [students, teachers, attendance] = await Promise.all([
      readSheet(SHEET.STUDENTS),
      readSheet(SHEET.TEACHERS),
      readSheet(SHEET.ATTENDANCE),
    ]);

    const total =
      students.filter((s) => s.Session === session).length +
      teachers.filter((t) => t.Session === session).length;

    const attended = attendance.filter(
      (r) => r.Date === date && r.Session === session && r.Status === '출석',
    ).length;

    const absent = total - attended;
    const rate = total === 0 ? 0 : Math.round((attended / total) * 100);

    return NextResponse.json({ total, attended, absent, rate });
  } catch (error) {
    console.error('[api/summary]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
