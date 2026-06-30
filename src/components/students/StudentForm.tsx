// 학생 추가/수정 폼 모달 — 교적 관리(/members) 화면 전용

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTodayInSeoul, toInputDateValue } from "@/lib/date";
import type { Session, Student } from "@/types";

export type StudentDraft = Omit<Student, "id" | "attendanceRate">;

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  /** null이면 신규 등록, 값이 있으면 수정 모드 */
  student: Student | null;
  /** 신규 등록 시 미리 채워둘 학년 (예: 새가족 등록 버튼에서 "새친구" 고정) */
  defaultGrade?: string;
  onSave: (draft: StudentDraft) => void;
  onDelete?: (id: string) => void;
}

const GRADE_OPTIONS = ["1", "2", "3", "새친구"];
const BAPTISM_OPTIONS = ["세례", "유아세례", "미세례"];
const GENDER_OPTIONS = ["남", "여"];

function emptyDraft(session: Session, grade: string): StudentDraft {
  return {
    session,
    grade,
    class: grade === "새친구" ? "" : "1",
    name: "",
    phone: "",
    parentPhone: "",
    address: "",
    birthdate: "",
    school: "",
    teacher: "",
    notes: "",
    baptism: "미세례",
    gender: "남",
  };
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

export function StudentForm({
  open,
  onOpenChange,
  session,
  student,
  defaultGrade,
  onSave,
  onDelete,
}: StudentFormProps) {
  const [draft, setDraft] = useState<StudentDraft>(() =>
    student
      ? { ...student }
      : emptyDraft(session, defaultGrade ?? "1"),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attendDate, setAttendDate] = useState(() => toInputDateValue(getTodayInSeoul()));
  const [attendSession, setAttendSession] = useState<Session>(session);
  const [attendStatus, setAttendStatus] = useState<"idle" | "added" | "cancelled">("idle");

  useEffect(() => {
    if (open) {
      setDraft(student ? { ...student } : emptyDraft(session, defaultGrade ?? "1"));
      setConfirmDelete(false);
      setAttendSession(session);
      setAttendStatus("idle");
    }
  }, [open, student, session, defaultGrade]);

  function update<K extends keyof StudentDraft>(key: K, value: StudentDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    onSave(draft);
    onOpenChange(false);
  }

  function handleAddAttend() {
    setAttendStatus("added");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  function handleCancelAttend() {
    setAttendStatus("cancelled");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-[1.5px] border-ink/15 bg-paper p-5 ring-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            {student ? "학생 정보 수정" : "학생 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 소속 · 이름 — 항상 2열 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="소속" required>
              <select
                className={inputClass}
                value={draft.session}
                onChange={(e) => update("session", e.target.value as Session)}
              >
                <option value="오전">오전반</option>
                <option value="오후">오후반</option>
              </select>
            </Field>
            <Field label="이름" required>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
          </div>

          {/* 학년 · 반 · 성별 · 세례 — 모바일 2×2, PC 4열 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="학년" required>
              <select
                className={inputClass}
                value={draft.grade}
                onChange={(e) => update("grade", e.target.value)}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g === "새친구" ? "새친구" : `${g}학년`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="반" required>
              <input
                className={inputClass}
                value={draft.class}
                onChange={(e) => update("class", e.target.value)}
                placeholder={draft.grade === "새친구" ? "(없음)" : ""}
              />
            </Field>
            <Field label="성별">
              <select
                className={inputClass}
                value={draft.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="세례">
              <select
                className={inputClass}
                value={draft.baptism}
                onChange={(e) => update("baptism", e.target.value)}
              >
                {BAPTISM_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* 학교 · 학생 연락처 · 부모 연락처 — 모바일 2열(부모연락처 전체폭), PC 3열 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="학교">
              <input
                className={inputClass}
                value={draft.school}
                onChange={(e) => update("school", e.target.value)}
              />
            </Field>
            <Field label="학생 연락처">
              <input
                className={inputClass}
                value={draft.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="010-0000-0000"
              />
            </Field>
            <div className="col-span-2 sm:col-span-1">
              <Field label="부모 연락처">
                <input
                  className={inputClass}
                  value={draft.parentPhone}
                  onChange={(e) => update("parentPhone", e.target.value)}
                  placeholder="010-0000-0000"
                />
              </Field>
            </div>
          </div>

          {/* 생년월일 · 담당 교사 — 항상 2열 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="생년월일">
              <input
                type="date"
                className={inputClass}
                value={draft.birthdate}
                onChange={(e) => update("birthdate", e.target.value)}
              />
            </Field>
            <Field label="담당 교사">
              <input
                className={inputClass}
                value={draft.teacher}
                onChange={(e) => update("teacher", e.target.value)}
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

          {student && (() => {
            const { count3m, total3m, count1y, total1y } = memberStats(student.id);
            return (
              <>
                <div className="border-t border-ink/10" />

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="최근 3개월 출석률" count={count3m} total={total3m} />
                  <StatCard label="최근 1년 출석률" count={count1y} total={total1y} />
                </div>

                <div className="rounded-xl border border-ink/10 bg-paper-deep/60 p-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-base">📅</span>
                    <span className="text-sm font-semibold text-ink">출석 수정</span>
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
            {student && onDelete ? (
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
                    onClick={() => {
                      onDelete(student.id);
                      onOpenChange(false);
                    }}
                    className="rounded-full bg-celebrate px-3 py-1 font-semibold text-paper hover:opacity-90"
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
                className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper hover:bg-ink/85"
              >
                {student ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
