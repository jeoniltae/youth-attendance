import { NextRequest, NextResponse } from 'next/server';

type AuthRole = 'admin' | 'session' | 'registry';

// role별 비교 대상 환경변수
//   admin    : /members(데이터 수정) · /teachers(교사 명단)
//   session  : 공개 3화면(/, /history, /birthday) — 교사 다수가 공유
//   registry : /registry(학생 교적부) — 교역자·부장집사 전용
// 비밀번호를 셋으로 나눠, 교사 다수가 아는 비밀번호와 데이터 수정 권한,
// 그리고 교적부 열람 권한이 서로 섞이지 않도록 한다.
const ENV_VAR_BY_ROLE: Record<AuthRole, string> = {
  admin: 'ADMIN_PASSWORD',
  session: 'SESSION_PASSWORD',
  registry: 'REGISTRY_PASSWORD',
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
  // `role in ENV_VAR_BY_ROLE`을 쓰면 안 된다 — in은 프로토타입 체인까지 뒤져서
  // role이 'constructor'·'toString' 같은 Object.prototype 멤버면 통과해버린다.
  // (인증이 뚫리진 않지만 envVarName이 함수가 되어 400 대신 500으로 샌다)
  if (!Object.prototype.hasOwnProperty.call(ENV_VAR_BY_ROLE, role)) {
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
