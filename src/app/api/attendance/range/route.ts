// 기간 출석 조회 — from~to 사이의 '날짜 → 출석 ID 목록'을 한 번에 반환.
//
// Attendance 시트는 수천 행이라 1회 읽기에 수백 ms가 든다. 주별로 /api/attendance를
// N번 부르면 N배가 되므로, 범위 조회는 반드시 이 엔드포인트로 1회 읽어 잘라 쓴다.
//
// session 파라미터는 받지 않는다 — 단일 조회(/api/attendance)와 같은 이유로,
// 출석은 '날짜만의 사실'이고 세션 좁히기는 화면이 명단(roster)으로 한다.

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: '시작일과 종료일은 필수입니다' }, { status: 400 });
  }
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다' }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: '시작일이 종료일보다 늦습니다' }, { status: 400 });
  }

  try {
    const attendance = await readSheet(SHEET.ATTENDANCE);

    // 같은 날 같은 인원의 중복 행(레거시/동시 토글로 드물게 발생)이 2회로 세어지지 않도록
    // Set으로 모은 뒤 배열화한다 — /api/stats/rates와 동일한 방어
    const byDate = new Map<string, Set<string>>();
    for (const r of attendance) {
      if (r.Status !== '출석' || !r.StudentID) continue;
      if (r.Date < from || r.Date > to) continue;
      let ids = byDate.get(r.Date);
      if (!ids) byDate.set(r.Date, (ids = new Set()));
      ids.add(r.StudentID);
    }

    const dates: Record<string, string[]> = {};
    for (const [date, ids] of byDate) {
      dates[date] = [...ids];
    }

    return NextResponse.json({ dates });
  } catch (error) {
    console.error('[api/attendance/range][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
