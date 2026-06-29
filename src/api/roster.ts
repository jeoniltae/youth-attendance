// 세션별 학생/교사 명단 조회 — Route Handler 호출 (출석체크/출석현황 공통)

import type { Session, Student, Teacher } from "@/types";

export interface RosterResponse {
  students: Student[];
  teachers: Teacher[];
}

export async function getRoster(session: Session): Promise<RosterResponse> {
  const res = await fetch(`/api/roster?session=${encodeURIComponent(session)}`);
  if (!res.ok) throw new Error("명단을 불러오지 못했습니다");
  return res.json();
}
