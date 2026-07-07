import type { Session } from "@/types";

export interface GradeStats {
  rate: number;
  attended: number;
  total: number;
  count: number;
}

export interface StatsResponse {
  weeks: number;
  overall: { rate: number; attended: number; total: number };
  grade1: GradeStats;
  grade2: GradeStats;
  grade3: GradeStats;
  teachers: GradeStats;
}

export async function getStats(session: Session): Promise<StatsResponse> {
  const res = await fetch(`/api/stats?session=${encodeURIComponent(session)}`);
  if (!res.ok) throw new Error("통계를 불러오지 못했습니다");
  return res.json();
}

export interface MemberStats {
  count3m: number;
  total3m: number;
  count1y: number;
  total1y: number;
}

export async function getMemberStats(id: string, session: Session): Promise<MemberStats> {
  const res = await fetch(
    `/api/stats/member?id=${encodeURIComponent(id)}&session=${encodeURIComponent(session)}`,
  );
  if (!res.ok) throw new Error("출석 통계를 불러오지 못했습니다");
  return res.json();
}
