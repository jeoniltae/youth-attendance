// 기간 모드 전용 — 기간 내 개근/무출석 인원을 칩으로 요약. 누르면 명단 모달을 띄운다.
// 모달은 AttendanceListModal을 그대로 재사용한다(기간 모드 렌더가 이미 들어 있음).

"use client";

import { useState } from "react";
import { Award, TriangleAlert } from "lucide-react";
import { AttendanceListModal } from "./AttendanceListModal";
import type { MemberItem } from "@/lib/group-members";

interface AttendanceHighlightsProps {
  /** 이 세션 전체 인원(학생+교사) */
  members: MemberItem[];
  attendCounts: Map<string, number>;
  weeks: number;
}

export function AttendanceHighlights({
  members,
  attendCounts,
  weeks,
}: AttendanceHighlightsProps) {
  const [openKey, setOpenKey] = useState<"perfect" | "none" | null>(null);

  if (weeks < 2) return null;

  const perfect = members.filter((m) => (attendCounts.get(m.id) ?? 0) === weeks);
  const none = members.filter((m) => (attendCounts.get(m.id) ?? 0) === 0);

  const selected =
    openKey === "perfect"
      ? { title: `개근 (${weeks}주 전체 출석)`, list: perfect }
      : openKey === "none"
        ? { title: `무출석 (${weeks}주 중 0회)`, list: none }
        : null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => setOpenKey("perfect")}
        disabled={perfect.length === 0}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-teal/40 bg-teal/10 px-3.5 py-1.5 text-sm font-semibold text-ink hover:border-teal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-teal/40"
      >
        <Award className="size-3.5 text-teal" strokeWidth={2.5} />
        개근 {perfect.length}명
      </button>
      <button
        type="button"
        onClick={() => setOpenKey("none")}
        disabled={none.length === 0}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-stamp/40 bg-stamp/10 px-3.5 py-1.5 text-sm font-semibold text-ink hover:border-stamp disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stamp/40"
      >
        <TriangleAlert className="size-3.5 text-stamp" strokeWidth={2.5} />
        무출석 {none.length}명
      </button>

      {selected && (
        <AttendanceListModal
          open
          onOpenChange={(o) => {
            if (!o) setOpenKey(null);
          }}
          title={selected.title}
          members={selected.list}
          attendCounts={attendCounts}
          weeks={weeks}
        />
      )}
    </div>
  );
}
