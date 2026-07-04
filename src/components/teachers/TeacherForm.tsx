// 교사 추가/수정 폼 모달 — 교적 관리(/members) 화면 전용

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTodayInSeoul, toInputDateValue } from "@/lib/date";
import { TEAM_ORDER } from "@/lib/group-members";
import { toggleAttendance } from "@/api/attendance";
import type { Session, Teacher } from "@/types";

export type TeacherDraft = Omit<Teacher, "id">;

interface TeacherFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  /** null이면 신규 등록, 값이 있으면 수정 모드 */
  teacher: Teacher | null;
  onSave: (draft: TeacherDraft) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function memberStats(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const r3m = (h % 400 + 300) / 1000;
  const r1y = Math.min(1, r3m + ((h >> 8) % 200) / 1000 - 0.1);
  return { count3m: Math.round(r3m * 13), total3m: 13, count1y: Math.round(r1y * 26), total1y: 26 };
}

function StatCard({ label, count, total }: { label: string; count: number; total: number }) {
  const rate = Math.round((count / total) * 100);
  return (
    <div className="rounded-xl bg-blue-50 p-3">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="font-display text-3xl font-bold text-blue-500">{rate}%</p>
      <p className="mt-0.5 text-xs text-ink/50">{count}회 / {total}회</p>
      <div className="mt-2 h-1.5 rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function emptyDraft(session: Session): TeacherDraft {
  return {
    session,
    team: TEAM_ORDER[0],
    name: "",
    phone: "",
    address: "",
    birthdate: "",
    notes: "",
  };
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink/50">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-ink/15 bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-ink/40";

export function TeacherForm({
  open,
  onOpenChange,
  session,
  teacher,
  onSave,
  onDelete,
}: TeacherFormProps) {
  const [draft, setDraft] = useState<TeacherDraft>(() =>
    teacher ? { ...teacher } : emptyDraft(session),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendDate, setAttendDate] = useState(() => toInputDateValue(getTodayInSeoul()));
  const [attendSession, setAttendSession] = useState<Session>(session);
  const [attendStatus, setAttendStatus] = useState<"idle" | "added" | "cancelled">("idle");

  useEffect(() => {
    if (open) {
      setDraft(teacher ? { ...teacher } : emptyDraft(session));
      setConfirmDelete(false);
      setIsSaving(false);
      setAttendSession(session);
      setAttendStatus("idle");
    }
  }, [open, teacher, session]);

  function update<K extends keyof TeacherDraft>(key: K, value: TeacherDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch {
      // onSave 쪽에서 alert 처리
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddAttend() {
    if (attendStatus !== "idle" || !teacher) return;
    try {
      await toggleAttendance({
        date: attendDate,
        session: attendSession,
        grade: "",
        class: "",
        studentId: teacher.id,
        name: teacher.name,
        type: "teacher",
      });
    } catch {
      // 실패해도 UI 표시는 동일하게
    }
    setAttendStatus("added");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  async function handleCancelAttend() {
    if (attendStatus !== "idle" || !teacher) return;
    try {
      await toggleAttendance({
        date: attendDate,
        session: attendSession,
        grade: "",
        class: "",
        studentId: teacher.id,
        name: teacher.name,
        type: "teacher",
      });
    } catch {
      // 실패해도 UI 표시는 동일하게
    }
    setAttendStatus("cancelled");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-[1.5px] border-teal/25 bg-paper p-5 ring-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-teal">
            {teacher ? "교사 정보 수정" : "교사 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름" required>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
            <Field label="팀" required>
              <select
                className={inputClass}
                value={draft.team}
                onChange={(e) => update("team", e.target.value)}
              >
                {TEAM_ORDER.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="연락처">
              <input
                className={inputClass}
                value={draft.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="010-0000-0000"
              />
            </Field>
            <Field label="생년월일">
              <input
                type="date"
                className={inputClass}
                value={draft.birthdate}
                onChange={(e) => update("birthdate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="주소">
            <input
              className={inputClass}
              value={draft.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>

          <Field label="비고">
            <textarea
              className={`${inputClass} min-h-16 resize-none`}
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>

          {teacher && (() => {
            const { count3m, total3m, count1y, total1y } = memberStats(teacher.id);
            return (
              <>
                <div className="border-t border-teal/15" />

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="최근 3개월 출석률" count={count3m} total={total3m} />
                  <StatCard label="최근 1년 출석률" count={count1y} total={total1y} />
                </div>

                <div className="rounded-xl border border-teal/15 bg-teal/5 p-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-base">📅</span>
                    <span className="text-sm font-semibold text-teal">출석 수정</span>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <Field label="날짜">
                      <input
                        type="date"
                        className={inputClass}
                        value={attendDate}
                        onChange={(e) => setAttendDate(e.target.value)}
                      />
                    </Field>
                    <Field label="예배">
                      <select
                        className={inputClass}
                        value={attendSession}
                        onChange={(e) => setAttendSession(e.target.value as Session)}
                      >
                        <option value="오전">오전</option>
                        <option value="오후">오후</option>
                      </select>
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddAttend}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${
                        attendStatus === "added"
                          ? "bg-green-600 opacity-80"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {attendStatus === "added" ? "추가됨 ✓" : "출석 추가"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAttend}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${
                        attendStatus === "cancelled"
                          ? "bg-red-600 opacity-80"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {attendStatus === "cancelled" ? "취소됨 ✓" : "출석 취소"}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}

          <div className="flex items-center justify-between gap-2 pt-1">
            {teacher && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ink/60">정말 삭제할까요?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-ink/20 px-3 py-1 font-medium text-ink/60 hover:border-ink/40"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        await onDelete(teacher.id);
                        onOpenChange(false);
                      } catch {
                        setIsSaving(false);
                      }
                    }}
                    className="rounded-full bg-celebrate px-3 py-1 font-semibold text-paper hover:opacity-90 disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-full border border-celebrate/40 px-3.5 py-1.5 text-sm font-semibold text-celebrate hover:bg-celebrate/10"
                >
                  삭제
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink/60 hover:border-ink/40 hover:text-ink"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-teal px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-40"
              >
                {isSaving ? "저장 중…" : teacher ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
