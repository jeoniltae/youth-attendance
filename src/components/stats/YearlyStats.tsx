"use client";

import { X } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/common/Skeleton";
import { getStats, type GradeStats } from "@/api/stats";
import type { Session } from "@/types";

const studentConfig = {
  attended: { label: "출석", color: "var(--ink)" },
  absent:   { label: "결석", color: "oklch(0.92 0.014 260)" },
} satisfies ChartConfig;

const teacherConfig = {
  attended: { label: "출석", color: "var(--teal)" },
  absent:   { label: "결석", color: "oklch(0.92 0.014 175)" },
} satisfies ChartConfig;

// 전체 밴드(잉크색 점수판)용 — 어두운 배경 위 스탬프색 링
const overallConfig = {
  attended: { label: "출석", color: "var(--stamp)" },
  absent:   { label: "결석", color: "oklch(1 0 0 / 0.16)" },
} satisfies ChartConfig;

const DONUT_CONFIG = {
  student: studentConfig,
  teacher: teacherConfig,
  overall: overallConfig,
} as const;

type DonutVariant = keyof typeof DONUT_CONFIG;

function DonutChart({
  rate,
  variant,
  size = "md",
}: {
  rate: number;
  variant: DonutVariant;
  size?: "md" | "lg";
}) {
  const config = DONUT_CONFIG[variant];
  const data = [{ value: rate }, { value: Math.max(0, 100 - rate) }];
  const box = size === "lg" ? "h-28 w-28" : "h-24 w-24";
  const [innerRadius, outerRadius] = size === "lg" ? [34, 47] : [28, 40];

  return (
    <div className={`relative mx-auto ${box}`}>
      <ChartContainer config={config} className={`aspect-square ${box}`}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill="var(--color-attended)" />
            <Cell fill="var(--color-absent)" />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className={`font-bold tabular-nums ${
            variant === "overall" ? "text-lg text-paper" : "text-base text-ink"
          }`}
        >
          {rate}%
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  sub,
  variant = "student",
  stats,
}: {
  label: string;
  sub: string;
  variant?: "student" | "teacher";
  stats: GradeStats | { rate: number; attended: number; total: number };
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border-[1.5px] border-ink/10 bg-paper p-4 shadow-[0_3px_0_rgba(30,34,51,0.04)]">
      <DonutChart rate={stats.rate} variant={variant} />
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="tabular-nums text-xs text-ink/50">
        {`${stats.attended.toLocaleString()}회`} / {`${stats.total.toLocaleString()}회`}
      </p>
      <p className="text-xs text-ink/35">{sub}</p>
    </div>
  );
}

// 전체 통계 밴드 — 출석체크 메인 SummaryBar와 같은 잉크색 점수판 스타일로 학년/교사 카드와 위계를 구분
function OverallBand({
  overall,
  weeks,
}: {
  overall: { rate: number; attended: number; total: number };
  weeks: number;
}) {
  const weeklyAverage = weeks > 0 ? Math.round(overall.attended / weeks) : 0;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-ink px-5 py-4 shadow-[0_3px_0_rgba(30,34,51,0.12)] sm:flex-row sm:gap-6">
      <DonutChart rate={overall.rate} variant="overall" size="lg" />
      <div className="text-center sm:text-left">
        <p className="font-display text-[0.65rem] tracking-[0.25em] text-stamp">OVERALL</p>
        <p className="font-display text-lg font-bold text-paper">전체</p>
        <p className="tabular-nums text-sm text-paper/60">
          {`${overall.attended.toLocaleString()}회`} / {`${overall.total.toLocaleString()}회`}
        </p>
      </div>
      <div className="flex divide-x divide-paper/15 sm:ml-auto">
        <div className="px-4 text-center">
          <p className="text-[0.65rem] text-paper/45">집계 기간</p>
          <p className="font-display text-base font-bold tabular-nums text-paper">{weeks}주</p>
        </div>
        <div className="px-4 text-center">
          <p className="text-[0.65rem] text-paper/45">주평균 출석</p>
          <p className="font-display text-base font-bold tabular-nums text-paper">{weeklyAverage}명</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-ink/10 bg-paper p-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-2.5 w-10" />
    </div>
  );
}

export function YearlyStats({
  session,
  onClose,
  enabled = true,
}: {
  session: Session;
  onClose: () => void;
  /** false면 API 자체를 호출하지 않음 — 비인증 상태에서 실데이터가 미리 로드되는 것 방지 */
  enabled?: boolean;
}) {
  const year = new Date().getFullYear();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", session],
    queryFn: () => getStats(session),
    staleTime: 300_000,
    enabled,
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 래퍼는 클릭을 통과시켜 배경 클릭 닫기를 유지하고, 모바일은 세로 중앙·sm+는 상단 고정 배치 */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:items-start sm:pt-20">
        <div className="pointer-events-auto flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden animate-[rise-in_0.2s_ease-out] rounded-2xl border-[1.5px] border-ink/15 bg-paper shadow-[0_8px_24px_rgba(30,34,51,0.12)]">
        <div className="flex shrink-0 items-center justify-between border-b border-ink/8 px-5 py-4">
          <div>
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
              YEARLY STATS
            </p>
            <h2 className="font-display text-xl font-bold text-ink">
              {year}년 출석 통계{" "}
              <span className="text-base font-normal text-ink/40">({session}부)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/15 p-2 text-ink/50 transition-colors hover:border-ink/30 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="p-5">
            {isError ? (
              <p className="py-8 text-center text-sm text-ink/40">통계를 불러오지 못했습니다</p>
            ) : (
              <div className="flex flex-col gap-3">
                {isLoading ? (
                  <>
                    <Skeleton className="h-44 rounded-xl sm:h-36" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  </>
                ) : data ? (
                  <>
                    <OverallBand overall={data.overall} weeks={data.weeks} />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatCard
                        label="1학년"
                        sub={`${data.grade1.count}명`}
                        stats={data.grade1}
                      />
                      <StatCard
                        label="2학년"
                        sub={`${data.grade2.count}명`}
                        stats={data.grade2}
                      />
                      <StatCard
                        label="3학년"
                        sub={`${data.grade3.count}명`}
                        stats={data.grade3}
                      />
                      <StatCard
                        label="선생님"
                        sub={`${data.teachers.count}명`}
                        variant="teacher"
                        stats={data.teachers}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <p className="border-t border-ink/8 px-5 py-3 text-center text-xs text-ink/35">
            최근 1년 기준 · 총 {data?.weeks ?? "—"}주 집계
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
