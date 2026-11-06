// 말씀노트 조회/저장 — Route Handler 호출

export interface ClassNoteStudent {
  id: string;
  name: string;
  written: boolean;
  present: boolean;
}

export interface ClassNotesResponse {
  session: string;
  grade: string;
  class: string;
  students: ClassNoteStudent[];
}

// 잘못된 토큰(404)이면 null — 화면이 오류가 아니라 안내로 보여 준다
export async function getClassNotes(
  token: string,
  date: string,
): Promise<ClassNotesResponse | null> {
  const res = await fetch(
    `/api/notes/class?token=${encodeURIComponent(token)}&date=${encodeURIComponent(date)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("말씀노트 명단을 불러오지 못했습니다");
  return res.json();
}

export interface SaveClassNotePayload {
  token: string;
  date: string;
  studentId: string;
  status: "작성" | "미작성";
}

export async function saveClassNote(payload: SaveClassNotePayload): Promise<void> {
  const res = await fetch("/api/notes/class", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("말씀노트 기록을 저장하지 못했습니다");
}

export interface NotesSummaryStudent {
  id: string;
  session: string;
  grade: string;
  class: string;
  name: string;
  phone: string;
  count: number;
}

export interface NotesSummaryResponse {
  /** 그 기간 전체 일요일 수 (고정 분모) */
  sundays: number;
  students: NotesSummaryStudent[];
}

export async function getNotesSummary(period: string): Promise<NotesSummaryResponse> {
  const res = await fetch(`/api/notes/summary?period=${encodeURIComponent(period)}`);
  if (!res.ok) throw new Error("말씀노트 집계를 불러오지 못했습니다");
  return res.json();
}
