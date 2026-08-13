// 출석 조회/토글 — Route Handler 호출

import type { MemberType, Session } from "@/types";

export interface AttendanceResponse {
  studentIds: string[];
}

export async function getAttendance(
  date: string,
  session: Session,
): Promise<AttendanceResponse> {
  const res = await fetch(
    `/api/attendance?date=${encodeURIComponent(date)}&session=${encodeURIComponent(session)}`,
  );
  if (!res.ok) throw new Error("출석 정보를 불러오지 못했습니다");
  return res.json();
}

export interface AttendanceRangeResponse {
  /** 날짜(YYYY-MM-DD) → 그날 출석한 인원 ID 목록. 출석 기록이 없는 날짜는 키 자체가 없음 */
  dates: Record<string, string[]>;
}

// 기간 출석 조회 — 주별로 여러 번 부르지 말 것(시트 1회 읽기로 범위 전체를 받는다)
export async function getAttendanceRange(
  from: string,
  to: string,
): Promise<AttendanceRangeResponse> {
  const res = await fetch(
    `/api/attendance/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!res.ok) throw new Error("기간 출석 정보를 불러오지 못했습니다");
  return res.json();
}

export interface ToggleAttendancePayload {
  date: string;
  session: Session;
  grade: string;
  class: string;
  studentId: string;
  name: string;
  type: MemberType;
  /** 목표 상태 — 지정하면 서버가 멱등 처리(이미 그 상태면 no-op), 생략하면 토글 */
  status?: "출석" | "결석";
}

export interface ToggleAttendanceResponse {
  status: "출석" | "결석";
}

export async function toggleAttendance(
  payload: ToggleAttendancePayload,
): Promise<ToggleAttendanceResponse> {
  const res = await fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("출석 상태를 변경하지 못했습니다");
  return res.json();
}
