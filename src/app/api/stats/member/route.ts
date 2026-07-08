// 개인(학생/교사) 출석 통계 — 최근 3개월/1년 출석일 수와 해당 기간의 예배일 수
// 레거시 GAS(getStudentAttendanceStats)와 동일하게 세션 무관·날짜 단위로 집계.
// 출석은 하루 1회 원칙이므로 같은 날 중복 행이 있어도 날짜 Set으로 1회만 센다.

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  // session 파라미터는 하위 호환을 위해 받되 집계에는 사용하지 않음 (세션 무관 날짜 기준)

  if (!id) {
    return NextResponse.json({ error: 'id는 필수입니다' }, { status: 400 });
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

    // 분모: 출석 기록이 있는 모든 날짜(=실제 예배일) 수 — 세션 무관
    const total1y = new Set(inRange.map((r) => r.Date)).size;
    const total3m = new Set(
      inRange.filter((r) => r.Date >= threeMonthsAgoStr).map((r) => r.Date),
    ).size;

    // 분자: 그 사람이 출석한 날짜 수 — 세션 무관, 날짜 Set으로 중복 제거(하루 1회)
    const myDates = new Set(inRange.filter((r) => r.StudentID === id).map((r) => r.Date));
    const count1y = myDates.size;
    const count3m = [...myDates].filter((d) => d >= threeMonthsAgoStr).length;

    return NextResponse.json({ count3m, total3m, count1y, total1y });
  } catch (error) {
    console.error('[api/stats/member][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
