// 교사 추가/수정 폼 모달 — 교적 관리(/members) 화면 전용

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/common/Skeleton";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { formatDateLabel, parseInputDate, sundaysThisYear } from "@/lib/date";
import { TEAM_ORDER } from "@/lib/group-members";
import { toggleAttendance } from "@/api/attendance";
import { getMemberStats } from "@/api/stats";
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

function StatCard({ label, count, total }: { label: string; count: number; total: number }) {
  const rate = total === 0 ? 0 : Math.min(100, Math.round((count / total) * 100));
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
  // 올해 일요일(예배일) 목록 — 최신이 맨 앞, 미래·작년 미포함
  const sundayOptions = useMemo(() => sundaysThisYear(), []);
  const [attendDate, setAttendDate] = useState(() => sundayOptions[0] ?? "");
  const [attendStatus, setAttendStatus] = useState<
    "idle" | "adding" | "added" | "cancelling" | "cancelled"
  >("idle");
  const [attendMessage, setAttendMessage] = useState<string | null>(null);

  // 실제 Attendance 기록 기반 개인 출석 통계 (수정 모드에서만 조회)
  const { data: memberStats, refetch: refetchStats } = useQuery({
    queryKey: ["member-stats", teacher?.id, teacher?.session],
    queryFn: () => getMemberStats(teacher!.id, teacher!.session),
    enabled: open && !!teacher,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (open) {
      setDraft(teacher ? { ...teacher } : emptyDraft(session));
      setConfirmDelete(false);
      setIsSaving(false);
      setAttendDate(sundayOptions[0] ?? "");
      setAttendStatus("idle");
      setAttendMessage(null);
    }
  }, [open, teacher, session, sundayOptions]);

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

  function attendPayload() {
    return {
      date: attendDate,
      // 출석 판정은 세션 무관(하루 1회)이며, 기록되는 세션 값은 저장된 소속을 따른다
      session: teacher!.session,
      grade: "",
      class: "",
      studentId: teacher!.id,
      name: teacher!.name,
      type: "teacher" as const,
    };
  }

  async function handleAddAttend() {
    if (attendStatus !== "idle" || !teacher) return;
    setAttendMessage(null);
    setAttendStatus("adding");
    try {
      const res = await toggleAttendance(attendPayload());
      // 토글은 상태 반전 — '결석'이 오면 이미 출석이던 걸 지운 것이므로 원복하고 안내
      if (res.status === "결석") {
        await toggleAttendance(attendPayload());
        setAttendMessage("이미 출석 처리되어 있습니다.");
        setAttendStatus("idle");
        return;
      }
    } catch {
      setAttendMessage("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setAttendStatus("idle");
      return;
    }
    await refetchStats();
    setAttendStatus("added");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  async function handleCancelAttend() {
    if (attendStatus !== "idle" || !teacher) return;
    setAttendMessage(null);
    setAttendStatus("cancelling");
    try {
      const res = await toggleAttendance(attendPayload());
      // '출석'이 오면 원래 기록이 없어 새로 추가된 것 → 원복하고 안내 (0회에서 -1 방지)
      if (res.status === "출석") {
        await toggleAttendance(attendPayload());
        setAttendMessage("취소할 출석 기록이 없습니다.");
        setAttendStatus("idle");
        return;
      }
    } catch {
      setAttendMessage("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setAttendStatus("idle");
      return;
    }
    await refetchStats();
    setAttendStatus("cancelled");
    setTimeout(() => setAttendStatus("idle"), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-[1.5px] border-teal/25 bg-paper p-5 ring-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-teal">
            {teacher ? "교사 정보 수정" : "교사 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          </div>

          <Field label="생년월일">
            <input
              type="date"
              className={inputClass}
              value={draft.birthdate}
              onChange={(e) => update("birthdate", e.target.value)}
            />
          </Field>

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

          {teacher && (
              <>
                <div className="border-t border-teal/15" />

                <div className="grid grid-cols-2 gap-3">
                  {memberStats ? (
                    <>
                      <StatCard label="최근 3개월 출석률" count={memberStats.count3m} total={memberStats.total3m} />
                      <StatCard label="최근 1년 출석률" count={memberStats.count1y} total={memberStats.total1y} />
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-[104px] rounded-xl" />
                      <Skeleton className="h-[104px] rounded-xl" />
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-teal/15 bg-teal/5 p-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-base">📅</span>
                    <span className="text-sm font-semibold text-teal">출석 수정</span>
                  </div>
                  <div className="mb-3">
                    <Field label="예배일 (일요일)">
                      <select
                        className={inputClass}
                        value={attendDate}
                        onChange={(e) => {
                          setAttendDate(e.target.value);
                          setAttendMessage(null);
                        }}
                      >
                        {sundayOptions.map((d) => (
                          <option key={d} value={d}>
                            {formatDateLabel(parseInputDate(d))}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="mt-1.5 text-xs text-ink/45">
                      {teacher.session} 예배 기준으로 기록됩니다
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddAttend}
                      disabled={attendStatus === "adding" || attendStatus === "cancelling"}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-60 ${
                        attendStatus === "added"
                          ? "bg-green-600 opacity-80"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {attendStatus === "adding" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          추가 중…
                        </>
                      ) : attendStatus === "added" ? (
                        "추가됨 ✓"
                      ) : (
                        "출석 추가"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAttend}
                      disabled={attendStatus === "adding" || attendStatus === "cancelling"}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-60 ${
                        attendStatus === "cancelled"
                          ? "bg-red-600 opacity-80"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {attendStatus === "cancelling" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          취소 중…
                        </>
                      ) : attendStatus === "cancelled" ? (
                        "취소됨 ✓"
                      ) : (
                        "출석 취소"
                      )}
                    </button>
                  </div>

                  {attendMessage && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 animate-[rise-in_0.25s_ease-out]">
                      <TriangleAlert className="size-4 shrink-0" />
                      {attendMessage}
                    </div>
                  )}
                </div>
              </>
          )}

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

        {isSaving && <LoadingOverlay />}
      </DialogContent>
    </Dialog>
  );
}
