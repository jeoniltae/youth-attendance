"use client";
// 출석체크 메인 페이지 — 학생/교사 출석 토글 및 요약 통계

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookUser, Cake, ClipboardList, Lock, TriangleAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileNavMenu } from "@/components/layout/MobileNavMenu";
import { PublicGate } from "@/components/common/PublicGate";
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
import { useAuthGate } from "@/hooks/useAuthGate";
import { formatDateLabel, getTodayInSeoul, mostRecentSunday, parseInputDate, toInputDateValue } from "@/lib/date";
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
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 학년/교사/새친구/확인 필요 등 특정 그룹으로 필터링하면 해당 결과가 화면 아래에 나타나는데,
  // 스크롤 위치는 그대로라 필터 전 스크롤이 깊었으면 빈 영역만 보이는 문제가 있었다.
  // "전체"는 목록이 줄어드는 게 아니라 늘어나는 방향이라 같은 문제가 없으므로 스크롤하지 않는다.
  useEffect(() => {
    if (filter.level === "all") return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filter]);

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
    toggle,
  } = useAttendance(date, session, isSessionAuthenticated);

  const isLoading = rosterLoading || attendanceLoading;
  const isError = rosterError || attendanceError;

  // 화면이 다루는 날짜(date)가 실제 오늘과 같을 때만 체크 가능 — 지난 예배는 조회만,
  // 수정은 학생 관리 화면에서. 렌더마다 실시간 재계산되므로(30초 폴링 등으로 재렌더 시)
  // 다음 일요일 당일이 되면 별도 처리 없이 자동으로 체크 가능해진다
  const isCheckable = toInputDateValue(getTodayInSeoul()) === date;

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
    // 카드가 이미 잠겨 있어 클릭이 안 되지만, 방어적으로 한 번 더 막는다
    if (!isCheckable) return;
    const member = memberLookup.get(id);
    if (!member) return;
    toggle({ date, session, studentId: id, ...member });
  }

  return (
    <PublicGate
      isAuthenticated={sessionAuth.isAuthenticated}
      checked={sessionAuth.checked}
      login={sessionAuth.login}
    >
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
          actions={
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:contents">
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
                <Link
                  href="/registry"
                  className="flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
                >
                  <BookUser className="size-4" />
                  교적부
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
            </div>
          }
          mobileMenu={
            <MobileNavMenu
              items={[
                {
                  key: "history",
                  label: "출석현황",
                  icon: ClipboardList,
                  barClass: "bg-ink",
                  iconClass: "text-ink",
                  href: "/history",
                },
                {
                  key: "birthday",
                  label: "생일축하",
                  icon: Cake,
                  barClass: "bg-celebrate",
                  iconClass: "text-celebrate",
                  href: "/birthday",
                },
                {
                  key: "registry",
                  label: "교적부",
                  icon: BookUser,
                  barClass: "bg-teal",
                  iconClass: "text-teal",
                  href: "/registry",
                },
                {
                  key: "members",
                  label: "학생 관리",
                  icon: Lock,
                  barClass: "bg-stamp",
                  iconClass: "text-stamp",
                  href: "/members",
                },
              ]}
            />
          }
        />
      </div>

      {!isLoading && !isCheckable && (
        <div
          className="flex items-center gap-2 rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-medium text-ink/60 animate-[rise-in_0.4s_ease-out_both]"
          style={{ animationDelay: "100ms" }}
        >
          <TriangleAlert className="size-4 shrink-0 text-ink/40" />
          지난 예배({formatDateLabel(parseInputDate(date))}) 조회 중 — 출석 수정은 학생 관리에서 가능합니다
        </div>
      )}

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

      <div ref={resultsRef} className="flex scroll-mt-20 flex-col gap-4">
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
                locked={!isCheckable}
                onToggle={toggleMember}
              />
            </div>
          ))
        )}
      </div>
    </main>
    </PublicGate>
  );
}
