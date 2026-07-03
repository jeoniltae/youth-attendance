import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';
import type { Session } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

interface StatGroup {
  rate: number;
  attended: number;
  total: number;
  count: number;
}

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get('session');

  if (!session) {
    return NextResponse.json({ error: '세션은 필수입니다' }, { status: 400 });
  }
  if (!SESSIONS.includes(session as Session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    // 한국 시간(UTC+9) 기준 오늘 ~ 1년 전
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowStr = nowKST.toISOString().slice(0, 10);
    const yearAgoKST = new Date(nowKST);
    yearAgoKST.setUTCFullYear(nowKST.getUTCFullYear() - 1);
    const yearAgoStr = yearAgoKST.toISOString().slice(0, 10);

    const [attendance, students, teachers] = await Promise.all([
      readSheet(SHEET.ATTENDANCE),
      readSheet(SHEET.STUDENTS),
      readSheet(SHEET.TEACHERS),
    ]);

    const filtered = attendance.filter(
      (r) =>
        r.Session === session &&
        r.Status === '출석' &&
        r.Date >= yearAgoStr &&
        r.Date <= nowStr,
    );

    const weeks = new Set(filtered.map((r) => r.Date)).size;

    // 학년별 출석 횟수 집계 (student 타입)
    const gradeAttended: Record<string, number> = {};
    for (const r of filtered) {
      if (r.Type === 'student' || r.Type === '') {
        gradeAttended[r.Grade] = (gradeAttended[r.Grade] ?? 0) + 1;
      }
    }

    // 교사 출석 횟수
    const teacherAttended = filtered.filter((r) => r.Type === 'teacher').length;

    // 세션별 학생 수 (학년별)
    const sessionStudents = students.filter((s) => s.Session === session);
    const gradeCount: Record<string, number> = {};
    for (const s of sessionStudents) {
      gradeCount[s.Grade] = (gradeCount[s.Grade] ?? 0) + 1;
    }

    // 세션별 교사 수
    const teacherCount = teachers.filter((t) => t.Session === session).length;

    function buildGrade(grade: string): StatGroup {
      const count = gradeCount[grade] ?? 0;
      const attended = gradeAttended[grade] ?? 0;
      const total = count * weeks;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { rate, attended, total, count };
    }

    const grade1 = buildGrade('1');
    const grade2 = buildGrade('2');
    const grade3 = buildGrade('3');

    const teacherTotal = teacherCount * weeks;
    const teacherStat: StatGroup = {
      rate: teacherTotal > 0 ? Math.round((teacherAttended / teacherTotal) * 100) : 0,
      attended: teacherAttended,
      total: teacherTotal,
      count: teacherCount,
    };

    // 전체: 모든 학생 + 교사
    const allStudentCount = Object.values(gradeCount).reduce((s, c) => s + c, 0);
    const allStudentAttended = Object.values(gradeAttended).reduce((s, c) => s + c, 0);
    const overallTotal = (allStudentCount + teacherCount) * weeks;
    const overallAttended = allStudentAttended + teacherAttended;

    return NextResponse.json({
      weeks,
      overall: {
        rate: overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0,
        attended: overallAttended,
        total: overallTotal,
      },
      grade1,
      grade2,
      grade3,
      teachers: teacherStat,
    });
  } catch (error) {
    console.error('[api/stats][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
