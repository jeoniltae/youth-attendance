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

/** 반기 출석 집계 — 교적부의 상반기/하반기 컬럼용 */
export interface HalfTermStats {
  /**
   * 그 반기의 일요일 총 수 (분모). 달력으로 미리 정해지는 값이라 반기 내내 고정이다
   * — 주가 지날 때마다 분모가 늘어나면 같은 사람의 8/11이 다음 주에 8/12가 되어 읽기 어렵다.
   */
  total: number;
  /** id → 그 반기 출석 횟수. 기록 없는 인원은 키가 없음(=0회) */
  counts: Record<string, number>;
}

export interface AttendanceRatesResponse {
  total1y: number;
  /** id → 1년 출석률(정수 %). 출석 기록 없는 인원은 키가 없음(=0%) */
  rates: Record<string, number>;
  /** 올해 1~6월 */
  firstHalf: HalfTermStats;
  /** 올해 7~12월 */
  secondHalf: HalfTermStats;
}

// 전 인원 1년 출석률 일괄 조회 (교적부 출석률 컬럼) — 세션 무관, Attendance 1회 읽기
export async function getAttendanceRates(): Promise<AttendanceRatesResponse> {
  const res = await fetch(`/api/stats/rates`);
  if (!res.ok) throw new Error("출석률을 불러오지 못했습니다");
  return res.json();
}
