// 개인(학생/교사) 출석 통계 — 최근 3개월/1년 출석 횟수와 해당 기간의 예배 횟수
// 분모는 해당 세션에서 출석 기록이 1건이라도 있는 날짜(=실제 예배일) 수

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';
import type { Session } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const session = request.nextUrl.searchParams.get('session');

  if (!id || !session) {
    return NextResponse.json({ error: 'id와 세션은 필수입니다' }, { status: 400 });
  }
  if (!SESSIONS.includes(session as Session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    // 한국 시간(UTC+9) 기준 오늘 ~ 1년 전 / 3개월 전
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowStr = nowKST.toISOString().slice(0, 10);
    const yearAgoKST = new Date(nowKST);
    yearAgoKST.setUTCFullYear(nowKST.getUTCFullYear() - 1);
    const yearAgoStr = yearAgoKST.toISOString().slice(0, 10);
    const threeMonthsAgoKST = new Date(nowKST);
    threeMonthsAgoKST.setUTCMonth(nowKST.getUTCMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgoKST.toISOString().slice(0, 10);

    const attendance = await readSheet(SHEET.ATTENDANCE);
    const inRange = attendance.filter(
      (r) => r.Status === '출석' && r.Date >= yearAgoStr && r.Date <= nowStr,
    );

    // 분모: 조회 세션 기준 실제 예배일 수 (세션 이동과 무관하게 "그 세션에 몇 번 예배가 있었는지")
    const inRangeSession = inRange.filter((r) => r.Session === session);
    const total1y = new Set(inRangeSession.map((r) => r.Date)).size;
    const total3m = new Set(
      inRangeSession.filter((r) => r.Date >= threeMonthsAgoStr).map((r) => r.Date),
    ).size;

    // 분자: ID로만 매칭 (세션 필터 제외) — ID는 오전/오후 통틀어 고유하므로,
    // 오전↔오후로 소속을 옮긴 이력이 있어도 과거 출석 기록이 사라지지 않아야 함
    const mine = inRange.filter((r) => r.StudentID === id);
    const count1y = mine.length;
    const count3m = mine.filter((r) => r.Date >= threeMonthsAgoStr).length;

    return NextResponse.json({ count3m, total3m, count1y, total1y });
  } catch (error) {
    console.error('[api/stats/member][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
