// 학년/교사/새친구 그룹별 출석 현황 — 반/팀 단위 누적 가로 막대 차트, 막대 클릭 시 명단 모달
"use client";

import { useState } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AttendanceListModal } from "./AttendanceListModal";
import {
  allMembers,
  countMembers,
  type MemberItem,
  type TopGroup,
} from "@/lib/group-members";

interface GroupAttendanceChartProps {
  group: TopGroup;
  attendedIds: Set<string>;
}

interface ChartRow {
  key: string;
  label: string;
  members: MemberItem[];
}

function renderCountLabel(
  x: unknown,
  y: unknown,
  width: unknown,
  height: unknown,
  row: { 출석: number; 결석: number },
) {
  return (
    <text
      x={Number(x) + Number(width) + 6}
      y={Number(y) + Number(height) / 2}
      dy={4}
      fontSize={11}
      className="fill-ink/50 font-medium tabular-nums"
    >
      {row.출석}/{row.출석 + row.결석}
    </text>
  );
}

const HEADER_COLOR: Record<TopGroup["variant"], string> = {
  grade: "text-ink",
  teacher: "text-teal",
  newFamily: "text-gold",
  incomplete: "text-celebrate",
};

const BAR_COLOR: Record<TopGroup["variant"], string> = {
  grade: "bg-ink",
  teacher: "bg-teal",
  newFamily: "bg-gold",
  incomplete: "bg-celebrate",
};

const chartConfig: ChartConfig = {
  출석: { label: "출석", color: "var(--stamp)" },
  결석: { label: "결석", color: "oklch(0.32 0.08 260 / 0.16)" },
};

export function GroupAttendanceChart({ group, attendedIds }: GroupAttendanceChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const rows: ChartRow[] = group.subGroups
    ? group.subGroups.map((sg) => ({ key: sg.key, label: sg.label, members: sg.members }))
    : [{ key: group.key, label: group.label, members: group.members ?? [] }];

  const chartData = rows.map((row) => {
    const attended = row.members.filter((m) => attendedIds.has(m.id)).length;
    return {
      key: row.key,
      label: row.label,
      출석: attended,
      결석: row.members.length - attended,
    };
  });

  const total = countMembers(group);
  const attendedTotal = allMembers(group).filter((m) => attendedIds.has(m.id)).length;
  const ratio = total === 0 ? 0 : Math.round((attendedTotal / total) * 100);
  const selectedRow = rows.find((r) => r.key === selectedKey) ?? null;

  function handleBarClick(data: unknown) {
    const payload = (data as { payload?: { key?: string }; key?: string })?.payload ?? data;
    const key = (payload as { key?: string })?.key;
    if (key) setSelectedKey(key);
  }

  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className={`font-display text-xl font-bold ${HEADER_COLOR[group.variant]}`}>
          {group.label}
        </h2>
        <span className="font-display text-sm tabular-nums text-ink/40">
          {attendedTotal} / {total}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[group.variant]}`}
          style={{ width: `${ratio}%` }}
        />
      </div>

      <ChartContainer
        config={chartConfig}
        className="mt-3 aspect-auto w-full"
        style={{ height: Math.max(rows.length * 44, 90) }}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 46, top: 4, bottom: 4 }}
          barCategoryGap={10}
        >
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ fontSize: 12 }}
          />
          <XAxis type="number" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar
            dataKey="출석"
            stackId="a"
            fill="var(--color-출석)"
            radius={[6, 0, 0, 6]}
            barSize={18}
            style={{ cursor: "pointer" }}
            onClick={handleBarClick}
          >
            {/* 결석이 0명이면 결석 막대 폭이 0이라 그 위의 라벨이 그려지지 않으므로, 그 경우엔 출석 막대 끝에 라벨을 붙인다.
                주의: 폭 0인 막대가 라벨 목록에서 빠지면 index가 행과 어긋나므로, index 대신 라벨 값(dataKey="label")으로 행을 찾는다 */}
            <LabelList
              dataKey="label"
              position="right"
              content={(props) => {
                const { x, y, width, height, value } = props;
                const row = chartData.find((r) => r.label === value);
                if (!row || row.결석 !== 0) return null;
                return renderCountLabel(x, y, width, height, row);
              }}
            />
          </Bar>
          <Bar
            dataKey="결석"
            stackId="a"
            fill="var(--color-결석)"
            radius={[0, 6, 6, 0]}
            barSize={18}
            style={{ cursor: "pointer" }}
            onClick={handleBarClick}
          >
            <LabelList
              dataKey="label"
              position="right"
              content={(props) => {
                const { x, y, width, height, value } = props;
                const row = chartData.find((r) => r.label === value);
                if (!row || row.결석 === 0) return null;
                return renderCountLabel(x, y, width, height, row);
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {selectedRow && (
        <AttendanceListModal
          open={!!selectedRow}
          onOpenChange={(o) => {
            if (!o) setSelectedKey(null);
          }}
          title={selectedRow.label}
          members={selectedRow.members}
          attendedIds={attendedIds}
        />
      )}
    </section>
  );
}
