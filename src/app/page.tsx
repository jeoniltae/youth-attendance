"use client";
// 출석체크 메인 페이지 — 학생/교사 출석 토글 및 요약 통계

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cake, ClipboardList, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SummaryBar } from "@/components/attendance/SummaryBar";
import {
  FilterChips,
  type FilterState,
} from "@/components/attendance/FilterChips";
import { GradeSection } from "@/components/attendance/GradeSection";
import { mockStudents, mockTeachers } from "@/lib/mock-data";
import {
  groupStudentsAndTeachers,
  countMembers,
  type TopGroup,
} from "@/lib/group-members";
import type { Session } from "@/types";

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
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>({ level: "all" });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    );
  }, []);

  const groups = useMemo(
    () => groupStudentsAndTeachers(mockStudents, mockTeachers),
    [],
  );
  const visibleGroups = useMemo(
    () => applyFilter(groups, filter),
    [groups, filter],
  );
  const total = useMemo(
    () => groups.reduce((sum, g) => sum + countMembers(g), 0),
    [groups],
  );

  const toggleMember = (id: string) => {
    setAttendedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="animate-[rise-in_0.5s_ease-out_both] text-center">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
          SUNDAY WORSHIP ROLL CALL
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">
          광염 고등부 출석체크
        </h1>
      </div>

      <div
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        <Header
          session={session}
          onSessionChange={setSession}
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
                href="/students"
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
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "140ms" }}
      >
        <SummaryBar total={total} attended={attendedIds.size} />
      </div>

      <div
        className="animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "210ms" }}
      >
        <FilterChips groups={groups} active={filter} onSelect={setFilter} />
      </div>

      <div className="flex flex-col gap-4">
        {visibleGroups.map((group, i) => (
          <div
            key={group.key}
            className="animate-[rise-in_0.5s_ease-out_both]"
            style={{ animationDelay: `${280 + i * 70}ms` }}
          >
            <GradeSection
              group={group}
              attendedIds={attendedIds}
              onToggle={toggleMember}
              index={i}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
