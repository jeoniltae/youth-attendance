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

    // 세션·학년은 출석 행에 저장된 값(체크 시점 복사본, 소속이 바뀌면 낡음)이 아니라
    // StudentID로 현재 명단(roster)을 조회해 '지금 소속'으로 귀속한다. 그래야 분자(출석 횟수)와
    // 분모(명단 인원)가 같은 기준이 되고, 세션 이동·학년 변경·라벨 불일치(예: 출석행 Grade='새가족'
    // ↔ 명단 Grade='새친구')·탈퇴자 고아 기록이 통계를 왜곡하지 않는다.
    const studentById = new Map(students.filter((s) => s.ID).map((s) => [s.ID, s]));
    const teacherById = new Map(teachers.filter((t) => t.ID).map((t) => [t.ID, t]));

    // 분모: 현재 명단에서 이 세션 인원 (학년별 학생 수 / 교사 수)
    const gradeCount: Record<string, number> = {};
    for (const s of students) {
      if (s.Session === session) gradeCount[s.Grade] = (gradeCount[s.Grade] ?? 0) + 1;
    }
    const teacherCount = teachers.filter((t) => t.Session === session).length;

    // 분자: 기간 내 출석 행을 StudentID로 명단에 조인해 '현재 이 세션' 인원만 집계.
    // 명단에 없는 기록(탈퇴자·레거시 고아 등)은 분모가 없으므로 제외.
    const inRange = attendance.filter(
      (r) => r.Status === '출석' && r.Date >= yearAgoStr && r.Date <= nowStr,
    );
    const gradeAttended: Record<string, number> = {};
    let teacherAttended = 0;
    const serviceDates = new Set<string>(); // 이 세션에 누군가 출석한 날 = 주(week) 수 산정 기준
    for (const r of inRange) {
      const teacher = teacherById.get(r.StudentID);
      if (teacher) {
        if (teacher.Session === session) {
          teacherAttended++;
          serviceDates.add(r.Date);
        }
        continue;
      }
      const student = studentById.get(r.StudentID);
      if (student && student.Session === session) {
        gradeAttended[student.Grade] = (gradeAttended[student.Grade] ?? 0) + 1;
        serviceDates.add(r.Date);
      }
    }
    const weeks = serviceDates.size;

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

    // 전체: 이 세션의 모든 학생(학년 무관, 새친구 포함) + 교사.
    // gradeAttended는 이미 명단 조인으로 이 세션 재적 인원만 담고 있으므로 그대로 합산하면 된다.
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
