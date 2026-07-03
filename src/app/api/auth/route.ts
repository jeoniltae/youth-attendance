import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const { password } = body;
  if (!password) {
    return NextResponse.json({ error: '비밀번호는 필수입니다' }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[api/auth] ADMIN_PASSWORD 환경변수가 설정되지 않았습니다');
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 });
  }

  return NextResponse.json({ token: 'authenticated' });
}
