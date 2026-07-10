"use client";
// 출석 현황 페이지 — 날짜/세션별 학년·교사·새친구 출석 차트 조회

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PublicGate } from "@/components/common/PublicGate";
import { SummaryBar } from "@/components/attendance/SummaryBar";
import { FloatingSummaryBar } from "@/components/attendance/FloatingSummaryBar";
import { GroupAttendanceChart } from "@/components/history/GroupAttendanceChart";
import { GroupAttendanceChartSkeleton } from "@/components/history/GroupAttendanceChartSkeleton";
import { useRoster } from "@/hooks/useRoster";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuthGate } from "@/hooks/useAuthGate";
import { groupStudentsAndTeachers } from "@/lib/group-members";
import { formatDateLabel, parseInputDate, sundaysThisYear } from "@/lib/date";
import type { Session } from "@/types";

const SESSIONS: Session[] = ["오전", "오후"];

export default function HistoryPage() {
  // 올해 일요일(예배일) 목록 — index 0이 가장 최근, 값이 클수록 과거
  const sundayOptions = useMemo(() => sundaysThisYear(), []);
  const [date, setDate] = useState(() => sundayOptions[0] ?? "");
  const [session, setSession] = useState<Session>("오전");
  const summaryRef = useRef<HTMLDivElement>(null);

  const dateIndex = sundayOptions.indexOf(date);
  const isPrevDisabled = dateIndex === -1 || dateIndex >= sundayOptions.length - 1;
  const isNextDisabled = dateIndex <= 0;

  function goToPrevSunday() {
    if (dateIndex === -1) return;
    const next = sundayOptions[dateIndex + 1];
    if (next) setDate(next);
  }

  function goToNextSunday() {
    if (dateIndex <= 0) return;
    setDate(sundayOptions[dateIndex - 1]);
  }

  // 단일 인스턴스만 유지 — PublicGate에도 이 값을 그대로 props로 넘겨서
  // 로그인 직후 데이터 훅의 enabled가 함께 갱신되도록 한다 (별도 호출 금지)
  const sessionAuth = useAuthGate("session");
  const isSessionAuthenticated = sessionAuth.isAuthenticated;

  const { data: roster, isLoading: rosterLoading, isError: rosterError } = useRoster(
    session,
    isSessionAuthenticated,
  );
  const {
    attendedIds,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useAttendance(date, session, isSessionAuthenticated);

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

  return (
    <PublicGate
      isAuthenticated={sessionAuth.isAuthenticated}
      checked={sessionAuth.checked}
      login={sessionAuth.login}
    >
    <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative flex items-center justify-center animate-[rise-in_0.5s_ease-out_both]">
        <Link
          href="/"
          className="absolute inset-y-0 left-0 hidden items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85 sm:flex"
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
      </div>

      <div
        className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-paper-deep shadow-[0_2px_0_rgba(30,34,51,0.08)] sm:flex-row animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        <div className="flex flex-1 items-center justify-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={goToPrevSunday}
            disabled={isPrevDisabled}
            aria-label="이전 주일"
            className="flex size-8 items-center justify-center rounded-full border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/20 disabled:hover:text-ink/60"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="relative">
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="조회할 예배일 (일요일)"
              className="appearance-none rounded-full border border-dashed border-ink/30 bg-paper py-1.5 pl-4 pr-8 font-display text-sm font-semibold text-ink hover:border-ink/50"
            >
              {sundayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDateLabel(parseInputDate(d))}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-ink/40" />
          </div>
          <button
            type="button"
            onClick={goToNextSunday}
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

      <div
        ref={summaryRef}
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "140ms" }}
      >
        <SummaryBar total={total} attended={attended} showAbsent loading={isLoading} />
      </div>
      <FloatingSummaryBar
        anchorRef={summaryRef}
        total={total}
        attended={attended}
        showAbsent
        loading={isLoading}
      />

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
    </PublicGate>
  );
}
