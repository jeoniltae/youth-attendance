// 전체 인원 1년 출석률 일괄 계산 — 교적부(/registry) 출석률(1년기준) 컬럼용.
// /api/stats/member와 동일한 기준(세션 무관, 날짜 Set으로 하루 1회)을 Attendance 시트
// 1회 읽기로 전 인원에 적용한다(개별 호출 N번 방지).

import { NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';

export async function GET() {
  try {
    // 한국 시간(UTC+9) 기준 오늘 ~ 1년 전
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowStr = nowKST.toISOString().slice(0, 10);
    const yearAgoKST = new Date(nowKST);
    yearAgoKST.setUTCFullYear(nowKST.getUTCFullYear() - 1);
    const yearAgoStr = yearAgoKST.toISOString().slice(0, 10);

    const attendance = await readSheet(SHEET.ATTENDANCE);
    const inRange = attendance.filter(
      (r) => r.Status === '출석' && r.Date >= yearAgoStr && r.Date <= nowStr,
    );

    // 분모: 기간 내 실제 예배일 수(세션 무관)
    const total1y = new Set(inRange.map((r) => r.Date)).size;

    // 분자: 각 인원이 출석한 날짜 수(하루 1회)
    const datesById = new Map<string, Set<string>>();
    for (const r of inRange) {
      if (!r.StudentID) continue;
      let set = datesById.get(r.StudentID);
      if (!set) datesById.set(r.StudentID, (set = new Set()));
      set.add(r.Date);
    }

    // id → 출석률(정수 %). 출석 기록 없는 인원은 응답에 없으므로 클라이언트에서 0%로 간주
    const rates: Record<string, number> = {};
    if (total1y > 0) {
      for (const [id, dates] of datesById) {
        rates[id] = Math.round((dates.size / total1y) * 100);
      }
    }

    return NextResponse.json({ total1y, rates });
  } catch (error) {
    console.error('[api/stats/rates][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
