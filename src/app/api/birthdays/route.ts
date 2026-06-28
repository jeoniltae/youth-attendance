// 생일자 조회 — 세션별 학생/교사 전체 반환 (월 필터링/그룹핑은 클라이언트의 groupBirthdaysByMonth가 담당)

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';
import type { Session, Student, Teacher } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

function toStudent(row: Record<string, string>): Student {
  return {
    id: row.ID,
    session: row.Session as Session,
    grade: row.Grade,
    class: row.Class,
    name: row.Name,
    phone: row.Phone,
    parentPhone: row.ParentPhone,
    address: row.Address,
    birthdate: row.Birthdate,
    school: row.School,
    teacher: row.Teacher,
    notes: row.Notes,
    attendanceRate: row['출석률'],
    baptism: row['세례'],
    gender: row.gender,
  };
}

function toTeacher(row: Record<string, string>): Teacher {
  return {
    id: row.ID,
    session: row.Session as Session,
    team: row.Team,
    name: row.Name,
    phone: row.Phone,
    address: row.Address,
    birthdate: row.Birthdate,
    notes: row.Notes,
  };
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
    const [studentRows, teacherRows] = await Promise.all([
      readSheet(SHEET.STUDENTS),
      readSheet(SHEET.TEACHERS),
    ]);

    const students = studentRows.filter((r) => r.Session === session).map(toStudent);
    const teachers = teacherRows.filter((r) => r.Session === session).map(toTeacher);

    return NextResponse.json({ students, teachers });
  } catch (error) {
    console.error('[api/birthdays]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
