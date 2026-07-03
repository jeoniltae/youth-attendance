import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow, SHEET } from '@/lib/sheets';
import type { Session, Student } from '@/types';

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

export function studentToRow(student: Student): string[] {
  return [
    student.id,
    student.session,
    student.grade,
    student.class,
    student.name,
    student.phone,
    student.parentPhone,
    student.address,
    student.birthdate,
    student.school,
    student.teacher,
    student.notes,
    student.attendanceRate,
    student.baptism,
    student.gender,
  ];
}

function generateStudentId(grade: string, cls: string, allRows: Record<string, string>[]): string {
  const year = new Date().getFullYear();
  const classForId = cls || '0';
  const prefix = `${year}-${grade}-${classForId}-`;
  const existing = allRows
    .filter((r) => r.ID?.startsWith(prefix))
    .map((r) => parseInt(r.ID.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const nextSeq = existing.length === 0 ? 1 : Math.max(...existing) + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
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
    const rows = await readSheet(SHEET.STUDENTS);
    const students = rows.filter((r) => r.Session === session).map(toStudent);
    return NextResponse.json({ students });
  } catch (error) {
    console.error('[api/students][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

interface CreateStudentBody {
  session: Session;
  grade: string;
  class: string;
  name: string;
  phone: string;
  parentPhone: string;
  address: string;
  birthdate: string;
  school: string;
  teacher: string;
  notes: string;
  attendanceRate: string;
  baptism: string;
  gender: string;
}

export async function POST(request: NextRequest) {
  let body: Partial<CreateStudentBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { session, grade, name } = body;
  if (!session || !grade || !name) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다 (session, grade, name)' }, { status: 400 });
  }
  if (!SESSIONS.includes(session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const allRows = await readSheet(SHEET.STUDENTS);
    const id = generateStudentId(grade, body.class ?? '', allRows);
    const student: Student = {
      id,
      session,
      grade,
      class: body.class ?? '',
      name,
      phone: body.phone ?? '',
      parentPhone: body.parentPhone ?? '',
      address: body.address ?? '',
      birthdate: body.birthdate ?? '',
      school: body.school ?? '',
      teacher: body.teacher ?? '',
      notes: body.notes ?? '',
      attendanceRate: body.attendanceRate ?? '',
      baptism: body.baptism ?? '',
      gender: body.gender ?? '',
    };
    await appendRow(SHEET.STUDENTS, studentToRow(student));
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('[api/students][POST]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
