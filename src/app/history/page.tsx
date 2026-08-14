"use client";
// 출석 현황 페이지 — 날짜/세션별 학년·교사·새친구 출석 차트 조회
//
// 조회 구간은 1주(단일 예배일)가 기본이고, 기간 길이를 늘리면 여러 주를 묶어 '주당 평균'으로
// 본다. 두 모드는 아래로 흘려보내는 값이 (attendCounts, weeks) 한 쌍으로 같아서,
// 1주 모드는 weeks=1인 특수 케이스일 뿐 별도 렌더 경로가 없다.

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicGate } from "@/components/common/PublicGate";
import { SummaryBar } from "@/components/attendance/SummaryBar";
import { FloatingSummaryBar } from "@/components/attendance/FloatingSummaryBar";
import { GroupAttendanceChart } from "@/components/history/GroupAttendanceChart";
import { GroupAttendanceChartSkeleton } from "@/components/history/GroupAttendanceChartSkeleton";
import { ServiceDateSelector } from "@/components/history/ServiceDateSelector";
import { WeeklyTrendChart } from "@/components/history/WeeklyTrendChart";
import { WeeklyTrendChartSkeleton } from "@/components/history/WeeklyTrendChartSkeleton";
import { Skeleton } from "@/components/common/Skeleton";
import { AttendanceHighlights } from "@/components/history/AttendanceHighlights";
import { useRoster } from "@/hooks/useRoster";
import { useAttendance } from "@/hooks/useAttendance";
import { useAttendanceRange } from "@/hooks/useAttendanceRange";
import { useAuthGate } from "@/hooks/useAuthGate";
import { groupStudentsAndTeachers, type MemberItem } from "@/lib/group-members";
import { buildRangeStats, resolveRange, type RangePreset } from "@/lib/attendance-range";
import { sundaysThisYear } from "@/lib/date";
import type { Session } from "@/types";

const SESSIONS: Session[] = ["오전", "오후"];

export default function HistoryPage() {
  // 올해 일요일(예배일) 목록 — index 0이 가장 최근, 값이 클수록 과거.
  // 과거 연도는 별도 스프레드시트라 현재 시트에 없으므로 구간은 이 목록을 벗어나지 않는다.
  const sundayOptions = useMemo(() => sundaysThisYear(), []);
  const [date, setDate] = useState(() => sundayOptions[0] ?? "");
  const [preset, setPreset] = useState<RangePreset>(1);
  const [customFrom, setCustomFrom] = useState(() => sundayOptions[0] ?? "");
  const [session, setSession] = useState<Session>("오전");
  const summaryRef = useRef<HTMLDivElement>(null);

  const { from, to, weeks: spanWeeks } = resolveRange(sundayOptions, date, preset, customFrom);
  const isRange = spanWeeks > 1;

  // 단일 인스턴스만 유지 — PublicGate에도 이 값을 그대로 props로 넘겨서
  // 로그인 직후 데이터 훅의 enabled가 함께 갱신되도록 한다 (별도 호출 금지)
  const sessionAuth = useAuthGate("session");
  const isSessionAuthenticated = sessionAuth.isAuthenticated;

  const { data: roster, isLoading: rosterLoading, isError: rosterError } = useRoster(
    session,
    isSessionAuthenticated,
  );

  // 두 훅을 항상 호출하고 enabled로만 스위치한다 — 1주 모드는 기존 훅 그대로라 회귀가 없고,
  // 주일에 '/'에서 넘어오면 같은 쿼리 키를 공유해 즉시 그려진다
  const single = useAttendance(date, session, isSessionAuthenticated && !isRange);
  const range = useAttendanceRange(
    from,
    to,
    isSessionAuthenticated && isRange,
    to === sundayOptions[0], // 진행 중인 주를 볼 때만 폴링
  );

  const groups = useMemo(
    () => groupStudentsAndTeachers(roster?.students ?? [], roster?.teachers ?? []),
    [roster],
  );

  // type을 실어 보내면 개근·결석 모달이 학생/선생님을 나눠 보여준다 (group-members.ts 참고)
  const rosterMembers: MemberItem[] = useMemo(
    () => [
      ...(roster?.students ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        type: "student" as const,
      })),
      ...(roster?.teachers ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        type: "teacher" as const,
      })),
    ],
    [roster],
  );

  const rangeStats = useMemo(
    () =>
      buildRangeStats(
        range.data?.dates ?? {},
        new Set(rosterMembers.map((m) => m.id).filter(Boolean)),
      ),
    [range.data, rosterMembers],
  );

  // 1주 모드는 '출석자 = 1회'인 기간 통계와 같다 — 아래 컴포넌트들은 이 한 쌍만 본다
  const attendCounts = useMemo(
    () =>
      isRange
        ? rangeStats.attendCounts
        : new Map([...single.attendedIds].map((id) => [id, 1] as const)),
    [isRange, rangeStats.attendCounts, single.attendedIds],
  );
  // 분모는 달력상 주 수가 아니라 실제로 예배가 있던 주 수 (수련회·명절 주 제외)
  const weeks = isRange ? rangeStats.serviceDates.length : 1;

  const total = (roster?.students.length ?? 0) + (roster?.teachers.length ?? 0);
  const attendedSum = rosterMembers.reduce((s, m) => s + (attendCounts.get(m.id) ?? 0), 0);
  const attended = weeks > 0 ? Math.round(attendedSum / weeks) : 0;

  const attendanceQuery = isRange ? range : single;
  const isLoading = rosterLoading || attendanceQuery.isLoading;
  const isError = rosterError || attendanceQuery.isError;

  // 본문 바와 스크롤 시 상단에 붙는 플로팅 바가 같은 문구를 쓰도록 한 곳에서 만든다.
  // 스크롤한 상태에서는 날짜 컨트롤이 화면 밖이라, 이 문구가 없으면 평균 인원을
  // 그날 하루 출석으로 오해하기 쉽다.
  const summaryCaption =
    isRange && !isLoading
      ? weeks === 0
        ? "선택 기간에 출석 기록이 없습니다"
        : `${weeks}주 평균`
      : undefined;

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
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85 sm:flex"
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
        <ServiceDateSelector
          sundayOptions={sundayOptions}
          date={date}
          onDateChange={setDate}
          preset={preset}
          onPresetChange={(p) => {
            // '직접 지정'으로 처음 들어오면 현재 구간의 시작일을 이어받는다
            if (p === "custom") setCustomFrom(from);
            setPreset(p);
          }}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          from={from}
          to={to}
          weeks={spanWeeks}
          // 기간을 바꾸면 배지의 '13주'는 즉시 바뀌는데 weeks(실제 예배 주)는 새 응답이
          // 와야 갱신된다. keepPreviousData 때문에 그 사이 isLoading이 false라, 그냥 두면
          // "13주 중 4주 예배"처럼 계산 결과를 단정하는 거짓 문구가 0.5초쯤 뜬다.
          // isPlaceholderData(=지금 보이는 건 이전 기간 데이터)일 때 null을 넘겨 꼬리말만
          // 감춘다. isFetching을 쓰면 30초 폴링 때도 참이라 같은 기간에서 문구가 깜빡인다.
          serviceWeeks={isRange && !isLoading && !range.isPlaceholderData ? weeks : null}
        />
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
        <SummaryBar
          total={total}
          attended={attended}
          showAbsent
          loading={isLoading}
          caption={summaryCaption}
        />
      </div>
      <FloatingSummaryBar
        anchorRef={summaryRef}
        total={total}
        attended={attended}
        showAbsent
        loading={isLoading}
        caption={summaryCaption}
      />

      {/* 로딩 중에도 자리를 잡아둔다 — 비워두면 데이터 도착 시 아래 차트들이 통째로 밀린다.
          칩 자리까지 함께 잡아야 밀림이 실제로 사라진다 */}
      {isRange && isLoading && !isError && (
        <>
          {/* AttendanceHighlights와 같은 구조(칩 줄 + 안내 문구)로 높이를 맞춘다 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {/* 폭은 실제 칩(모바일 82/116/90px)보다 살짝 좁게 — 넘치면 2줄로 접혀
                  오히려 스켈레톤이 실제보다 커진다 */}
              <Skeleton className="h-7.75 w-18 rounded-full sm:h-9.25 sm:w-24" />
              <Skeleton className="h-7.75 w-26 rounded-full sm:h-9.25 sm:w-32" />
              <Skeleton className="h-7.75 w-20 rounded-full sm:h-9.25 sm:w-24" />
            </div>
            <Skeleton className="h-4.75 w-40" />
          </div>
          <WeeklyTrendChartSkeleton />
        </>
      )}

      {isRange && !isLoading && !isError && weeks > 0 && (
        <>
          <AttendanceHighlights
            members={rosterMembers}
            attendCounts={attendCounts}
            weeks={weeks}
          />
          <WeeklyTrendChart
            weeklyTotals={rangeStats.weeklyTotals}
            total={total}
            onSelectDate={(d) => {
              setDate(d);
              setPreset(1);
            }}
          />
        </>
      )}

      {/* 카드가 5개라 카드마다 넣으면 같은 문구가 5번 반복돼 시끄럽다 — 그리드 위에 한 번만 */}
      {!isLoading && !isError && groups.length > 0 && (
        <p className="text-center text-xs text-ink/75">
          💡아래의 각 차트 항목을 누르면 해당 반·교사 명단 확인이 가능합니다
        </p>
      )}

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
              <GroupAttendanceChart
                group={group}
                attendCounts={attendCounts}
                weeks={weeks}
              />
            </div>
          ))
        )}
      </div>
    </main>
    </PublicGate>
  );
}
