"use client";

import { X } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
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

function DonutChart({ rate, variant }: { rate: number; variant: "student" | "teacher" }) {
  const config = variant === "teacher" ? teacherConfig : studentConfig;
  const data = [{ value: rate }, { value: Math.max(0, 100 - rate) }];

  return (
    <div className="relative mx-auto h-24 w-24">
      <ChartContainer config={config} className="aspect-square h-24 w-24">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={28}
            outerRadius={40}
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
        <span className="text-base font-bold tabular-nums text-ink">{rate}%</span>
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
        {stats.attended.toLocaleString()} / {stats.total.toLocaleString()}
      </p>
      <p className="text-xs text-ink/35">{sub}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-ink/10 bg-paper p-4">
      <div className="h-24 w-24 animate-pulse rounded-full bg-ink/8" />
      <div className="h-3 w-14 animate-pulse rounded bg-ink/8" />
      <div className="h-2.5 w-20 animate-pulse rounded bg-ink/8" />
      <div className="h-2.5 w-10 animate-pulse rounded bg-ink/8" />
    </div>
  );
}

export function YearlyStats({ session, onClose }: { session: Session; onClose: () => void }) {
  const year = new Date().getFullYear();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", session],
    queryFn: () => getStats(session),
    staleTime: 300_000,
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-4xl animate-[rise-in_0.2s_ease-out] rounded-2xl border-[1.5px] border-ink/15 bg-paper shadow-[0_8px_24px_rgba(30,34,51,0.12)]">
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
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

        <div className="p-5">
          {isError ? (
            <p className="py-8 text-center text-sm text-ink/40">통계를 불러오지 못했습니다</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              ) : data ? (
                <>
                  <StatCard
                    label="전체"
                    sub={`총 ${data.weeks}주`}
                    stats={data.overall}
                  />
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
                </>
              ) : null}
            </div>
          )}
        </div>

        <p className="border-t border-ink/8 px-5 py-3 text-center text-xs text-ink/35">
          최근 1년 기준 · 총 {data?.weeks ?? "—"}주 집계
        </p>
      </div>
    </>
  );
}
