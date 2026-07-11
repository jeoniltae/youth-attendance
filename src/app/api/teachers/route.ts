import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow, SHEET } from '@/lib/sheets';
import type { Session, Teacher } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

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
    lunarBirthdate: row.Lunar === 'TRUE',
  };
}

export function teacherToRow(teacher: Teacher): string[] {
  return [
    teacher.id,
    teacher.session,
    teacher.team,
    teacher.name,
    teacher.phone,
    teacher.address,
    teacher.birthdate,
    teacher.notes,
    teacher.lunarBirthdate ? 'TRUE' : 'FALSE',
  ];
}

function generateTeacherId(allRows: Record<string, string>[]): string {
  const year = new Date().getFullYear();
  const prefix = `T-${year}-`;
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
    const rows = await readSheet(SHEET.TEACHERS);
    const teachers = rows.filter((r) => r.Session === session).map(toTeacher);
    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('[api/teachers][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

interface CreateTeacherBody {
  session: Session;
  team: string;
  name: string;
  phone: string;
  address: string;
  birthdate: string;
  notes: string;
  lunarBirthdate: boolean;
}

export async function POST(request: NextRequest) {
  let body: Partial<CreateTeacherBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { session, team, name } = body;
  if (!session || !team || !name) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다 (session, team, name)' }, { status: 400 });
  }
  if (!SESSIONS.includes(session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const allRows = await readSheet(SHEET.TEACHERS);
    const id = generateTeacherId(allRows);
    const teacher: Teacher = {
      id,
      session,
      team,
      name,
      phone: body.phone ?? '',
      address: body.address ?? '',
      birthdate: body.birthdate ?? '',
      notes: body.notes ?? '',
      lunarBirthdate: body.lunarBirthdate ?? false,
    };
    await appendRow(SHEET.TEACHERS, teacherToRow(teacher));
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('[api/teachers][POST]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
