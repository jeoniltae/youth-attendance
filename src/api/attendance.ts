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

export interface ToggleAttendancePayload {
  date: string;
  session: Session;
  grade: string;
  class: string;
  studentId: string;
  name: string;
  type: MemberType;
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
