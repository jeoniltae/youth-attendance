"use client";
// 출석체크 메인 페이지 — 학생/교사 출석 토글 및 요약 통계

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cake, ClipboardList, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SummaryBar } from "@/components/attendance/SummaryBar";
import { FloatingSummaryBar } from "@/components/attendance/FloatingSummaryBar";
import {
  FilterChips,
  type FilterState,
} from "@/components/attendance/FilterChips";
import { GradeSection } from "@/components/attendance/GradeSection";
import { GradeSectionSkeleton } from "@/components/attendance/GradeSectionSkeleton";
import { useRoster } from "@/hooks/useRoster";
import { useAttendance } from "@/hooks/useAttendance";
import { mostRecentSunday, toInputDateValue } from "@/lib/date";
import {
  groupStudentsAndTeachers,
  countMembers,
  type TopGroup,
} from "@/lib/group-members";
import type { MemberType, Session } from "@/types";

function applyFilter(groups: TopGroup[], filter: FilterState): TopGroup[] {
  if (filter.level === "all") return groups;
  if (filter.level === "top") {
    return groups.filter((g) => g.key === filter.key);
  }
  return groups
    .filter((g) => g.key === filter.topKey)
    .map((g) => ({
      ...g,
      subGroups: g.subGroups?.filter((sg) => sg.key === filter.subKey),
    }));
}

export default function Home() {
  const [session, setSession] = useState<Session>("오전");
  // 평일에 열어도 항상 가장 최근 일요일(예배일) 기준으로 출석 조회/토글
  const [date] = useState(() => toInputDateValue(mostRecentSunday()));
  const [filter, setFilter] = useState<FilterState>({ level: "all" });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    );
  }, []);

  const { data: roster, isLoading: rosterLoading, isError: rosterError } = useRoster(session);
  const {
    attendedIds,
    isLoading: attendanceLoading,
    isError: attendanceError,
    toggle,
  } = useAttendance(date, session);

  const isLoading = rosterLoading || attendanceLoading;
  const isError = rosterError || attendanceError;

  const groups = useMemo(
    () => groupStudentsAndTeachers(roster?.students ?? [], roster?.teachers ?? []),
    [roster],
  );
  const visibleGroups = useMemo(
    () => applyFilter(groups, filter),
    [groups, filter],
  );
  const total = useMemo(
    () => groups.reduce((sum, g) => sum + countMembers(g), 0),
    [groups],
  );

  const memberLookup = useMemo(() => {
    const map = new Map<
      string,
      { grade: string; class: string; name: string; type: MemberType }
    >();
    for (const s of roster?.students ?? []) {
      map.set(s.id, { grade: s.grade, class: s.class, name: s.name, type: "student" });
    }
    for (const t of roster?.teachers ?? []) {
      map.set(t.id, { grade: "", class: "", name: t.name, type: "teacher" });
    }
    return map;
  }, [roster]);

  function toggleMember(id: string) {
    const member = memberLookup.get(id);
    if (!member) return;
    toggle({ date, session, studentId: id, ...member });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="animate-[rise-in_0.5s_ease-out_both] text-center">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
          SUNDAY WORSHIP ROLL CALL
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">
          광염 고등부 전자출석부
        </h1>
      </div>

      <div
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        <Header
          session={session}
          date={date}
          onSessionChange={(s) => {
            setSession(s);
            setFilter({ level: "all" });
          }}
          lastUpdated={lastUpdated}
          actions={
            <>
              <div className="flex items-center gap-2">
                <Link
                  href="/history"
                  className="flex items-center gap-1.5 rounded-full bg-ink/8 px-3.5 py-2 text-sm font-semibold text-ink hover:bg-ink/14"
                >
                  <ClipboardList className="size-4" />
                  출석현황
                </Link>
                <Link
                  href="/birthday"
                  className="flex items-center gap-1.5 rounded-full bg-celebrate px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
                >
                  <Cake className="size-4" />
                  생일축하
                </Link>
              </div>
              <div className="hidden h-7 w-[1.5px] self-center rounded-full bg-ink/40 lg:block" />
              <Link
                href="/members"
                className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-ink/85"
              >
                <Lock className="size-3.5" />
                학생 관리
              </Link>
            </>
          }
        />
      </div>

      <div
        ref={summaryRef}
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "140ms" }}
      >
        <SummaryBar total={total} attended={attendedIds.size} loading={isLoading} />
      </div>
      <FloatingSummaryBar
        anchorRef={summaryRef}
        total={total}
        attended={attendedIds.size}
        loading={isLoading}
      />

      <div
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "210ms" }}
      >
        <FilterChips groups={groups} active={filter} onSelect={setFilter} />
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <GradeSectionSkeleton key={i} />)
        ) : isError ? (
          <p className="py-12 text-center text-ink/40">데이터를 불러오지 못했습니다</p>
        ) : (
          visibleGroups.map((group, i) => (
            <div
              key={group.key}
              className="animate-[rise-in_0.5s_ease-out_both]"
              style={{ animationDelay: `${280 + i * 70}ms` }}
            >
              <GradeSection
                group={group}
                attendedIds={attendedIds}
                onToggle={toggleMember}
              />
            </div>
          ))
        )}
      </div>
    </main>
  );
}
