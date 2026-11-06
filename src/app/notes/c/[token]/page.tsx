// 말씀노트 QR 체크 화면 — 비밀번호 없이 토큰 링크로 열리므로 검색 노출만 막고 본체는 클라이언트에 둔다

import type { Metadata } from "next";
import { ClassNotesScreen } from "@/components/notes/ClassNotesScreen";

export const metadata: Metadata = {
  title: "말씀노트 체크",
  robots: { index: false, follow: false },
};

export default async function ClassNotesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClassNotesScreen token={token} />;
}
