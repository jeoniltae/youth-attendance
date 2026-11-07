// 말씀노트 기간 집계 — 시상 명단용. 화면은 admin 게이트 뒤에 있고 API는 기존 데이터 API와 같은 수준이다.
// 분모는 그 기간 전체 일요일 수로 고정한다(교적부 반기 컬럼과 같은 규칙, 진행 중인 기간도 같다).

import { NextRequest, NextResponse } from 'next/server';
import { readSheets, SHEET } from '@/lib/sheets';
import { countSundays } from '@/lib/date';
import { periodFromKey } from '@/lib/notes-period';
import { isNoteTarget } from '@/lib/notes-token';

export async function GET(request: NextRequest) {
  const period = periodFromKey(request.nextUrl.searchParams.get('period') ?? '');
  if (!period) {
    return NextResponse.json({ error: '기간이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const [students, notes] = await readSheets([SHEET.STUDENTS, SHEET.SERMON_NOTES]);

    // 날짜 Set으로 세어 같은 날 중복 행이 있어도 1회만 인정한다
    const datesById = new Map<string, Set<string>>();
    for (const r of notes) {
      if (r.Date < period.from || r.Date > period.to) continue;
      let dates = datesById.get(r.StudentID);
      if (!dates) datesById.set(r.StudentID, (dates = new Set()));
      dates.add(r.Date);
    }

    return NextResponse.json({
      sundays: countSundays(period.from, period.to),
      students: students
        .filter(isNoteTarget)
        .map((r) => ({
          id: r.ID,
          session: r.Session,
          grade: r.Grade,
          class: r.Class,
          name: r.Name,
          phone: r.Phone,
          count: datesById.get(r.ID)?.size ?? 0,
        }))
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.grade.localeCompare(b.grade, 'ko', { numeric: true }) ||
            a.class.localeCompare(b.class, 'ko', { numeric: true }) ||
            a.name.localeCompare(b.name, 'ko'),
        ),
    });
  } catch (error) {
    console.error('[api/notes/summary][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
