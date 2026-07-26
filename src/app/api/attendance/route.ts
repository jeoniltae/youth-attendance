// 출석 조회/토글 — 레코드 존재 여부로 출석 판정.
// POST는 body에 status(목표 상태)가 있으면 그 상태로 맞추는 멱등 동작(이미 그 상태면 no-op),
// 없으면 서버가 현재 상태를 보고 반전(토글) — 관리 폼(TeacherForm/StudentForm)이 토글 응답으로
// "이미 출석" 등을 감지하는 기존 동작과의 하위호환용

import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow, findRowNumber, deleteRow, SHEET } from '@/lib/sheets';
import type { MemberType, Session } from '@/types';

const SESSIONS: Session[] = ['오전', '오후'];
const MEMBER_TYPES: MemberType[] = ['student', 'teacher'];

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  const session = request.nextUrl.searchParams.get('session');

  if (!date || !session) {
    return NextResponse.json({ error: '날짜와 세션은 필수입니다' }, { status: 400 });
  }
  if (!SESSIONS.includes(session as Session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    const attendance = await readSheet(SHEET.ATTENDANCE);
    // 출석은 인당 하루 1회(세션 무관) — POST도 Date+StudentID로만 매칭한다.
    // 따라서 출석 여부는 '날짜만의 사실'이고, 세션 좁히기는 화면이 명단(roster)으로 한다.
    // session 파라미터는 API 하위호환을 위해 계속 받되 필터에는 쓰지 않는다.
    // (세션으로 거르면, 소속이 오전↔오후로 바뀐 인원의 당일 출석 행이 반대 세션 화면에서
    //  보이지 않아 체크가 저장돼도 즉시 되돌아가는 문제가 생긴다)
    void session;
    const studentIds = attendance
      .filter((r) => r.Date === date && r.Status === '출석')
      .map((r) => r.StudentID);

    return NextResponse.json({ studentIds });
  } catch (error) {
    console.error('[api/attendance][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

interface ToggleBody {
  date: string;
  session: Session;
  grade: string;
  class: string;
  studentId: string;
  name: string;
  type: MemberType;
  /** 목표 상태 — 있으면 멱등(이미 그 상태면 no-op), 없으면 토글 */
  status?: '출석' | '결석';
}

export async function POST(request: NextRequest) {
  let body: Partial<ToggleBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { date, session, grade, class: klass, studentId, name, type, status } = body;

  if (!date || !session || !studentId || !name || !type) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 });
  }
  if (!SESSIONS.includes(session)) {
    return NextResponse.json({ error: '세션 값이 올바르지 않습니다' }, { status: 400 });
  }
  if (!MEMBER_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type 값이 올바르지 않습니다' }, { status: 400 });
  }
  if (status !== undefined && status !== '출석' && status !== '결석') {
    return NextResponse.json({ error: 'status 값이 올바르지 않습니다' }, { status: 400 });
  }

  try {
    // 출석은 하루 1회 원칙 — 세션(오전/오후)을 판정에서 제외하고 날짜+StudentID로만 매칭.
    // 세션까지 넣으면, 소속을 오전↔오후로 옮긴 뒤 취소할 때 옛 세션 행을 못 찾아
    // 삭제 대신 새 행이 추가되어 같은 날 중복 출석(2회)이 생긴다.
    const rowNumber = await findRowNumber(
      SHEET.ATTENDANCE,
      (r) => r.Date === date && r.StudentID === studentId,
    );

    // 목표 상태가 명시됐고 이미 그 상태면 아무것도 하지 않음(멱등)
    if (status === '출석' && rowNumber !== null) {
      return NextResponse.json({ status: '출석' });
    }
    if (status === '결석' && rowNumber === null) {
      return NextResponse.json({ status: '결석' });
    }

    if (rowNumber === null) {
      await appendRow(SHEET.ATTENDANCE, [
        date,
        session,
        grade ?? '',
        klass ?? '',
        studentId,
        name,
        '출석',
        new Date().toISOString(),
        '',
        type,
      ]);
      return NextResponse.json({ status: '출석' });
    }

    await deleteRow(SHEET.ATTENDANCE, rowNumber);
    return NextResponse.json({ status: '결석' });
  } catch (error) {
    console.error('[api/attendance][POST]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
