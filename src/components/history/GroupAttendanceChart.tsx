// 학년/교사/새친구 그룹별 출석 현황 — 반/팀 단위 누적 가로 막대 차트, 막대 클릭 시 명단 모달
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Bar, BarChart, LabelList, Rectangle, XAxis, YAxis, type BarShapeProps } from "recharts";
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

interface ChartDatum {
  key: string;
  label: string;
  출석: number;
  결석: number;
}

// 차트 본체만 별도 memo 컴포넌트로 분리 — 부모의 모달 state(selectedKey)가 바뀌어도 여기는
// 재렌더되지 않아 막대 진입 애니메이션이 재생(=숫자 라벨 깜빡임)되지 않는다. 실제 데이터
// (chartData)나 클릭 핸들러가 바뀔 때만 재렌더되므로 최초 마운트 시 애니메이션은 정상 재생된다.
const AttendanceBars = memo(function AttendanceBars({
  chartData,
  height,
  onBarClick,
}: {
  chartData: ChartDatum[];
  height: number;
  onBarClick: (data: unknown) => void;
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className="mt-3 aspect-auto w-full"
      style={{ height }}
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
          onClick={onBarClick}
        >
          {/* 결석이 0명이면 결석 막대 폭이 0이라 그 위의 라벨이 그려지지 않으므로, 그 경우엔 출석 막대 끝에 라벨을 붙인다.
              주의: 폭 0인 막대가 라벨 목록에서 빠지면 index가 행과 어긋나므로, index 대신 라벨 값(dataKey="label")으로 행을 찾는다 */}
          <LabelList
            dataKey="label"
            position="right"
            content={(props) => {
              const { x, y, width, height: h, value } = props;
              const row = chartData.find((r) => r.label === value);
              if (!row || row.결석 !== 0) return null;
              return renderCountLabel(x, y, width, h, row);
            }}
          />
        </Bar>
        <Bar
          dataKey="결석"
          stackId="a"
          fill="var(--color-결석)"
          barSize={18}
          style={{ cursor: "pointer" }}
          onClick={onBarClick}
          // 출석이 0명이면 출석 막대(왼쪽 라운드 담당)가 폭 0으로 사라져 결석 막대 왼쪽 끝이
          // 각지게 보이므로, 그 경우엔 결석 막대에 좌우 모두 라운드를 준다
          shape={(props: BarShapeProps) => {
            const attended = (props.payload as { 출석?: number } | undefined)?.출석 ?? 0;
            const radius: [number, number, number, number] =
              attended === 0 ? [6, 6, 6, 6] : [0, 6, 6, 0];
            return <Rectangle {...props} radius={radius} />;
          }}
        >
          <LabelList
            dataKey="label"
            position="right"
            content={(props) => {
              const { x, y, width, height: h, value } = props;
              const row = chartData.find((r) => r.label === value);
              if (!row || row.결석 === 0) return null;
              return renderCountLabel(x, y, width, h, row);
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

export function GroupAttendanceChart({ group, attendedIds }: GroupAttendanceChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 모달 열림/닫힘(selectedKey)만 바뀌어도 이 컴포넌트가 재렌더링되는데, 매번 새 배열을
  // 만들면 recharts가 데이터가 바뀐 것으로 오인해 막대 진입 애니메이션을 다시 재생해 라벨
  // 숫자가 깜빡인다 — group/attendedIds가 실제로 바뀔 때만 새로 계산하도록 메모이제이션
  const rows: ChartRow[] = useMemo(
    () =>
      group.subGroups
        ? group.subGroups.map((sg) => ({ key: sg.key, label: sg.label, members: sg.members }))
        : [{ key: group.key, label: group.label, members: group.members ?? [] }],
    [group],
  );

  const chartData = useMemo(
    () =>
      rows.map((row) => {
        const attended = row.members.filter((m) => attendedIds.has(m.id)).length;
        return {
          key: row.key,
          label: row.label,
          출석: attended,
          결석: row.members.length - attended,
        };
      }),
    [rows, attendedIds],
  );

  const total = countMembers(group);
  const attendedTotal = allMembers(group).filter((m) => attendedIds.has(m.id)).length;
  const ratio = total === 0 ? 0 : Math.round((attendedTotal / total) * 100);
  const selectedRow = rows.find((r) => r.key === selectedKey) ?? null;

  // memo된 AttendanceBars가 이 핸들러 참조 변화로 재렌더되지 않도록 안정적으로 유지
  const handleBarClick = useCallback((data: unknown) => {
    const payload = (data as { payload?: { key?: string }; key?: string })?.payload ?? data;
    const key = (payload as { key?: string })?.key;
    if (key) setSelectedKey(key);
  }, []);

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

      <AttendanceBars
        chartData={chartData}
        height={Math.max(rows.length * 44, 90)}
        onBarClick={handleBarClick}
      />

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
