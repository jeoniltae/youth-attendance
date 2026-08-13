// 기간 모드 전용 — 주차별 전체 출석 인원 추이. 차트를 누르면 그 주의 1주 모드로 이동한다.
//
// y축은 0이 아니라 데이터 범위로 좁혀 잡는다. 전체 인원(수백 명)까지 축을 늘리면 주간
// 차이(보통 10명 안팎)가 몇 %의 높이로 뭉개져 '추이'가 전혀 보이지 않기 때문. 대신
// 기준을 잃지 않도록 기간 평균을 점선으로 깔고, 헤더에 명단 인원을 함께 적는다.
// (전체 대비 비율은 바로 위 요약바와 아래 반별 차트가 이미 보여준다)

"use client";

import { useCallback, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import {
  Area,
  Bar,
  ComposedChart,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  출석: { label: "출석", color: "var(--stamp)" },
};

interface WeeklyTrendChartProps {
  weeklyTotals: { date: string; attended: number }[];
  /** 세션 전체 인원 — 헤더에 기준으로 표기 */
  total: number;
  onSelectDate: (date: string) => void;
}

export function WeeklyTrendChart({
  weeklyTotals,
  total,
  onSelectDate,
}: WeeklyTrendChartProps) {
  // 점 위 숫자는 주가 많으면 겹치므로 짧은 구간에서만 표시.
  // (x축 라벨은 주 수가 아니라 화면 너비에 맞춰 recharts가 솎아낸다 — 아래 minTickGap)
  const showValueLabels = weeklyTotals.length <= 13;

  const { average, domain } = useMemo(() => {
    const values = weeklyTotals.map((w) => w.attended);
    if (values.length === 0) return { average: 0, domain: [0, 1] as [number, number] };
    const min = Math.min(...values);
    const max = Math.max(...values);
    // 여백이 없으면 최고/최저 주가 차트 가장자리에 딱 붙는다. 아래를 더 비우는 건
    // 면적이 실선 한 줄처럼 얇아지지 않게 하려는 것이고, 위는 margin.top이 라벨 자리를
    // 이미 확보하므로 조금만 준다. 모든 주가 같은 값이어도 납작해지지 않도록 최소 여백 보장.
    const spread = max - min;
    const padTop = Math.max(2, Math.round(spread * 0.25));
    const padBottom = Math.max(3, Math.round(spread * 0.55));
    return {
      average: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
      domain: [Math.max(0, min - padBottom), max + padTop] as [number, number],
    };
  }, [weeklyTotals]);

  const chartData = useMemo(
    () =>
      weeklyTotals.map((w) => ({
        date: w.date,
        // 2026-08-09 → 8/9
        label: `${Number(w.date.slice(5, 7))}/${Number(w.date.slice(8, 10))}`,
        출석: w.attended,
        // 투명 클릭 타깃 막대의 높이 — 차트 어디를 눌러도 그 주가 잡히게 y축 끝까지 채운다.
        // (ComposedChart의 onClick은 툴팁이 떠 있어도 발화하지 않아 Bar의 onClick을 쓴다)
        __hit: domain[1],
      })),
    [weeklyTotals, domain],
  );

  const handleClick = useCallback(
    (data: unknown) => {
      const payload = (data as { payload?: { date?: string } })?.payload ?? data;
      const date = (payload as { date?: string })?.date;
      if (date) onSelectDate(date);
    },
    [onSelectDate],
  );

  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      {/*
        보조 문구는 ink/75(5.6:1) 이상으로 둔다 — paper-deep 위에서 ink/40은 2:1대라
        읽히지 않는다. 숫자만 ink 100%로 올려 시선이 먼저 가게 한다.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-ink">
          주차별 출석 추이
          <span className="ml-2 text-xs font-medium text-ink/75">
            명단 <span className="font-semibold text-ink">{total}명</span> 기준
          </span>
        </h2>
        <span className="shrink-0 text-xs text-ink/75">차트를 누르면 그 주만 보기</span>
      </div>

      {/*
        x축 날짜는 ink/70, 출석 숫자는 ink 100% + 굵게 — 축과 데이터가 한눈에 다른 정보로 읽히게.
        ⚠ ui/chart.tsx의 `.recharts-cartesian-axis-tick text → fill-muted-foreground` 규칙은
        recharts v2 기준이라 v3에서는 매칭되지 않는다(v3는 text에 직접
        `.recharts-cartesian-axis-tick-value`를 붙인다). 그래서 눈금은 팔레트가 아닌 recharts
        기본 회색 #666으로 그려지고 있었고, 아래에서 실제 클래스로 지정해 팔레트로 되돌린다.
      */}
      <ChartContainer
        config={chartConfig}
        className="mt-3 aspect-auto h-40 w-full [&_.recharts-surface]:cursor-pointer [&_.recharts-cartesian-axis-tick-value]:fill-ink/70"
      >
        <ComposedChart
          data={chartData}
          // 좌우 여백 — 첫/마지막 주의 점 위 숫자와 x축 라벨이 그려질 자리
          margin={{ left: 20, right: 20, top: 22, bottom: 0 }}
          // 투명 클릭 막대가 밴드를 빈틈없이 채우게 — 기본 간격을 두면 주 사이에
          // 눌러도 반응하지 않는 죽은 구간이 생긴다
          barCategoryGap={0}
        >
          <defs>
            <linearGradient id="weekly-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--stamp)" stopOpacity={0.34} />
              <stop offset="100%" stopColor="var(--stamp)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            // 주 수로 간격을 고정하면 데스크탑에 맞춘 값이 모바일에서 겹친다.
            // minTickGap을 주면 recharts가 실제 너비를 보고 라벨을 솎아낸다.
            interval="preserveStartEnd"
            minTickGap={28}
            tick={{ fontSize: 12 }}
          />
          <YAxis hide domain={domain} />
          <ChartTooltip
            cursor={{ stroke: "var(--ink)", strokeOpacity: 0.2 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { date?: string } | undefined)?.date ?? ""
                }
              />
            }
          />
          <Bar
            dataKey="__hit"
            fill="transparent"
            isAnimationActive={false}
            // 클릭 전용 막대라 툴팁 목록에는 넣지 않는다
            tooltipType="none"
            style={{ cursor: "pointer" }}
            onClick={handleClick}
          />
          <ReferenceLine
            y={average}
            stroke="var(--ink)"
            strokeOpacity={0.4}
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="출석"
            stroke="var(--color-출석)"
            strokeWidth={2}
            fill="url(#weekly-trend-fill)"
            dot={{ r: 3, fill: "var(--color-출석)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          >
            {showValueLabels && (
              <LabelList
                dataKey="출석"
                position="top"
                offset={8}
                className="fill-ink font-display font-semibold tabular-nums"
                fontSize={12}
              />
            )}
          </Area>
        </ComposedChart>
      </ChartContainer>

      {/*
        범례 — 차트 안의 세 가지 표식(점 위 숫자 / 점선 / 아래쪽 날짜)이 각각 무엇인지 이름을 붙인다.
        눈금마다 아이콘을 달면 52주 조회에서 축이 지저분해지므로, 축 전체를 여기서 한 번만 설명한다.
      */}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-ink/75">
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full bg-stamp" />
          주간 출석 인원
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 shrink-0 border-t border-dashed border-ink/60" />
          평균 <span className="font-semibold text-ink">{average}명</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0 text-ink/60" />
          예배일
        </span>
      </div>
    </section>
  );
}
