// 말씀노트 QR 화면 API — 비밀번호 없는 화면이라 토큰이 가리키는 반 안에서만 읽고 쓴다.
// 이름 외 개인정보는 내려주지 않으며, 날짜도 화면을 믿지 않고 서버에서 검증한다.

import { NextRequest, NextResponse } from 'next/server';
import { appendRow, deleteRowsWhere, findRowNumber, readSheet, SHEET } from '@/lib/sheets';
import { isNoteTarget, resolveClassToken } from '@/lib/notes-token';
import type { ClassKey } from '@/lib/notes-token';
import { sundaysThisYear } from '@/lib/date';

type Row = Record<string, string>;

function resolveClass(token: string, students: Row[]): ClassKey | null {
  const classes = new Map<string, ClassKey>();
  for (const r of students) {
    if (!isNoteTarget(r)) continue;
    classes.set(`${r.Session}-${r.Grade}-${r.Class}`, {
      session: r.Session,
      grade: r.Grade,
      class: r.Class,
    });
  }
  return resolveClassToken(token, [...classes.values()]);
}

function isInClass(r: Row, klass: ClassKey): boolean {
  return (
    isNoteTarget(r) &&
    r.Session === klass.session &&
    r.Grade === klass.grade &&
    r.Class === klass.class
  );
}

// 올해 지나간 일요일만 허용 — 형식·요일·미래·지난해를 이 한 줄로 거른다
function isCheckableDate(date: string): boolean {
  return sundaysThisYear().includes(date);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const date = request.nextUrl.searchParams.get('date');

  if (!token || !date) {
    return NextResponse.json({ error: '토큰과 날짜는 필수입니다' }, { status: 400 });
  }
  if (!isCheckableDate(date)) {
    return NextResponse.json({ error: '날짜가 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const [students, notes, attendance] = await Promise.all([
      readSheet(SHEET.STUDENTS),
      readSheet(SHEET.SERMON_NOTES),
      readSheet(SHEET.ATTENDANCE),
    ]);

    const klass = resolveClass(token, students);
    if (!klass) {
      return NextResponse.json({ error: '잘못된 주소입니다' }, { status: 404 });
    }

    const written = new Set(notes.filter((r) => r.Date === date).map((r) => r.StudentID));
    const present = new Set(
      attendance.filter((r) => r.Date === date && r.Status === '출석').map((r) => r.StudentID),
    );

    return NextResponse.json({
      ...klass,
      students: students
        .filter((r) => isInClass(r, klass))
        .map((r) => ({
          id: r.ID,
          name: r.Name,
          written: written.has(r.ID),
          present: present.has(r.ID),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    });
  } catch (error) {
    console.error('[api/notes/class][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

interface SaveBody {
  token: string;
  date: string;
  studentId: string;
  /** 목표 상태 — 이미 그 상태면 no-op(멱등) */
  status: '작성' | '미작성';
}

export async function POST(request: NextRequest) {
  let body: Partial<SaveBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { token, date, studentId, status } = body;
  if (!token || !date || !studentId) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 });
  }
  if (status !== '작성' && status !== '미작성') {
    return NextResponse.json({ error: 'status 값이 올바르지 않습니다' }, { status: 400 });
  }
  if (!isCheckableDate(date)) {
    return NextResponse.json({ error: '날짜가 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const students = await readSheet(SHEET.STUDENTS);
    const klass = resolveClass(token, students);
    if (!klass) {
      return NextResponse.json({ error: '잘못된 주소입니다' }, { status: 404 });
    }

    const student = students.find((r) => r.ID === studentId);
    if (!student || !isInClass(student, klass)) {
      return NextResponse.json({ error: '이 반 학생이 아닙니다' }, { status: 403 });
    }

    const isTarget = (r: Row) => r.Date === date && r.StudentID === studentId;

    if (status === '미작성') {
      // 동시 저장으로 생긴 중복 행까지 모두 지운다 — 한 행만 지우면 체크가 되살아난다
      await deleteRowsWhere(SHEET.SERMON_NOTES, isTarget);
      return NextResponse.json({ status });
    }

    if ((await findRowNumber(SHEET.SERMON_NOTES, isTarget)) === null) {
      await appendRow(SHEET.SERMON_NOTES, [
        date,
        student.Session,
        student.Grade,
        student.Class,
        student.ID,
        student.Name,
        new Date().toISOString(),
      ]);
    }
    return NextResponse.json({ status });
  } catch (error) {
    console.error('[api/notes/class][POST]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
