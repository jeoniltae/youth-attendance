import { NextRequest, NextResponse } from 'next/server';

type AuthRole = 'admin' | 'session';

// role별 비교 대상 환경변수 — admin: /members(학생·교사 데이터 수정), session: 공개
// 3화면(/, /history, /birthday) 접근용. 두 비밀번호를 분리해 교사 다수가 아는
// 비밀번호와 실제 데이터 수정 권한의 비밀번호가 섞이지 않도록 한다.
const ENV_VAR_BY_ROLE: Record<AuthRole, string> = {
  admin: 'ADMIN_PASSWORD',
  session: 'SESSION_PASSWORD',
};

export async function POST(request: NextRequest) {
  let body: { password?: string; role?: AuthRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { password, role = 'admin' } = body;
  if (!password) {
    return NextResponse.json({ error: '비밀번호는 필수입니다' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'session') {
    return NextResponse.json({ error: 'role 값이 올바르지 않습니다' }, { status: 400 });
  }

  const envVarName = ENV_VAR_BY_ROLE[role];
  const expectedPassword = process.env[envVarName];
  if (!expectedPassword) {
    console.error(`[api/auth] ${envVarName} 환경변수가 설정되지 않았습니다`);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }

  if (password !== expectedPassword) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 });
  }

  return NextResponse.json({ token: 'authenticated' });
}
