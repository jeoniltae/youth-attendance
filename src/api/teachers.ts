import type { Session, Teacher } from "@/types";

export type TeacherPayload = Omit<Teacher, "id">;

export async function getTeachers(session: Session): Promise<{ teachers: Teacher[] }> {
  const res = await fetch(`/api/teachers?session=${encodeURIComponent(session)}`);
  if (!res.ok) throw new Error("교사 명단을 불러오지 못했습니다");
  return res.json();
}

export async function createTeacher(body: TeacherPayload): Promise<{ teacher: Teacher }> {
  const res = await fetch("/api/teachers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("교사 등록에 실패했습니다");
  return res.json();
}

export async function updateTeacher(
  id: string,
  body: TeacherPayload,
): Promise<{ teacher: Teacher }> {
  const res = await fetch(`/api/teachers/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("교사 정보 수정에 실패했습니다");
  return res.json();
}

export async function deleteTeacher(id: string): Promise<void> {
  const res = await fetch(`/api/teachers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("교사 삭제에 실패했습니다");
}
