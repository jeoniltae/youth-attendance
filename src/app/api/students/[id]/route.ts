import { NextRequest, NextResponse } from 'next/server';
import { findRowNumber, updateRow, deleteRow, deleteRowsWhere, SHEET } from '@/lib/sheets';
import { studentToRow } from '@/app/api/students/route';
import type { Session, Student } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Partial<Student>;
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
    const rowNumber = await findRowNumber(SHEET.STUDENTS, (r) => r.ID === id);
    if (rowNumber === null) {
      return NextResponse.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 });
    }

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
    await updateRow(SHEET.STUDENTS, rowNumber, studentToRow(student));
    return NextResponse.json({ student });
  } catch (error) {
    console.error('[api/students/[id]][PUT]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const rowNumber = await findRowNumber(SHEET.STUDENTS, (r) => r.ID === id);
    if (rowNumber === null) {
      return NextResponse.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 });
    }

    await deleteRow(SHEET.STUDENTS, rowNumber);
    // 삭제된 학생의 출석 기록도 정리 — 남겨두면 ID가 재사용될 때 새 학생이
    // 옛 출석 기록을 물려받아 출석률이 잘못 계산된다
    await deleteRowsWhere(SHEET.ATTENDANCE, (r) => r.StudentID === id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/students/[id]][DELETE]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
