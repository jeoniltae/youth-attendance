import type { Session, Student } from "@/types";

export type StudentPayload = Omit<Student, "id">;

export async function getStudents(session: Session): Promise<{ students: Student[] }> {
  const res = await fetch(`/api/students?session=${encodeURIComponent(session)}`);
  if (!res.ok) throw new Error("학생 명단을 불러오지 못했습니다");
  return res.json();
}

export async function createStudent(body: StudentPayload): Promise<{ student: Student }> {
  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("학생 등록에 실패했습니다");
  return res.json();
}

export async function updateStudent(
  id: string,
  body: StudentPayload,
): Promise<{ student: Student }> {
  const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("학생 정보 수정에 실패했습니다");
  return res.json();
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("학생 삭제에 실패했습니다");
}
