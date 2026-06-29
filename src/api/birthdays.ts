// 생일자 조회 — Route Handler 호출 (월 필터링은 클라이언트의 groupBirthdaysByMonth가 담당)

import type { Session, Student, Teacher } from "@/types";

export interface BirthdaysResponse {
  students: Student[];
  teachers: Teacher[];
}

export async function getBirthdayRoster(
  session: Session,
): Promise<BirthdaysResponse> {
  const res = await fetch(`/api/birthdays?session=${encodeURIComponent(session)}`);
  if (!res.ok) throw new Error("생일자 명단을 불러오지 못했습니다");
  return res.json();
}
