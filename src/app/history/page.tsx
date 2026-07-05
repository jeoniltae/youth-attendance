"use client";
// 출석 현황 페이지 — 날짜/세션별 학년·교사·새친구 출석 차트 조회

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { SummaryBar } from "@/components/attendance/SummaryBar";
import { GroupAttendanceChart } from "@/components/history/GroupAttendanceChart";
import { GroupAttendanceChartSkeleton } from "@/components/history/GroupAttendanceChartSkeleton";
import { useRoster } from "@/hooks/useRoster";
import { useAttendance } from "@/hooks/useAttendance";
import { groupStudentsAndTeachers } from "@/lib/group-members";
import {
  addDays,
  formatDateLabel,
  getTodayInSeoul,
  parseInputDate,
  toInputDateValue,
} from "@/lib/date";
import type { Session } from "@/types";

const SESSIONS: Session[] = ["오전", "오후"];

export default function HistoryPage() {
  const [date, setDate] = useState(() => toInputDateValue(getTodayInSeoul()));
  const [session, setSession] = useState<Session>("오전");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { data: roster, isLoading: rosterLoading, isError: rosterError } = useRoster(session);
  const {
    attendedIds,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useAttendance(date, session);

  const groups = useMemo(
    () => groupStudentsAndTeachers(roster?.students ?? [], roster?.teachers ?? []),
    [roster],
  );

  const total = (roster?.students.length ?? 0) + (roster?.teachers.length ?? 0);
  const attended = [...(roster?.students ?? []), ...(roster?.teachers ?? [])].filter((m) =>
    attendedIds.has(m.id),
  ).length;

  const isLoading = rosterLoading || attendanceLoading;
  const isError = rosterError || attendanceError;

  const today = toInputDateValue(getTodayInSeoul());
  const isNextDisabled = addDays(date, 7) > today;

  return (
    <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 animate-[rise-in_0.5s_ease-out_both]">
        <Link
          href="/"
          className="flex items-center gap-1.5 justify-self-start rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85"
        >
          <ArrowLeft className="size-3.5" />
          출석체크
        </Link>
        <div className="text-center">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
            ATTENDANCE OVERVIEW
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">출석 현황 조회</h1>
        </div>
        <div />
      </div>

      <div
        className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-paper-deep shadow-[0_2px_0_rgba(30,34,51,0.08)] sm:flex-row animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        <div className="flex flex-1 items-center justify-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -7))}
            aria-label="이전 주일"
            className="flex size-8 items-center justify-center rounded-full border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="rounded-full border border-dashed border-ink/30 bg-paper px-4 py-1.5 font-display text-sm font-semibold text-ink hover:border-ink/50"
          >
            {formatDateLabel(parseInputDate(date))}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 7))}
            disabled={isNextDisabled}
            aria-label="다음 주일"
            className="flex size-8 items-center justify-center rounded-full border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/20 disabled:hover:text-ink/60"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="h-px w-full shrink-0 bg-[repeating-linear-gradient(to_right,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)] opacity-20 sm:h-auto sm:w-px sm:self-stretch sm:bg-[repeating-linear-gradient(to_bottom,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)]" />
        <div className="flex flex-1 items-center justify-center gap-3 px-4 py-3">
          <span className="font-display text-[0.65rem] tracking-[0.2em] text-ink/50">예배</span>
          <div className="flex flex-1 max-w-72 gap-1.5">
            {SESSIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSession(s)}
                className={
                  s === session
                    ? "flex-1 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper"
                    : "flex-1 rounded-full border border-ink/25 px-4 py-1.5 text-sm font-medium text-ink/60 hover:border-ink/50 hover:text-ink"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="animate-[rise-in_0.5s_ease-out_both]" style={{ animationDelay: "140ms" }}>
        <SummaryBar total={total} attended={attended} showAbsent loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <GroupAttendanceChartSkeleton key={i} />)
        ) : isError ? (
          <p className="col-span-full py-12 text-center text-ink/40">
            데이터를 불러오지 못했습니다
          </p>
        ) : (
          groups.map((group, i) => (
            <div
              key={group.key}
              className="animate-[rise-in_0.5s_ease-out_both]"
              style={{ animationDelay: `${210 + i * 70}ms` }}
            >
              <GroupAttendanceChart group={group} attendedIds={attendedIds} />
            </div>
          ))
        )}
      </div>
    </main>
  );
}
