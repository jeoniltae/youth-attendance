// 학년/교사/새친구 그룹별 출석 현황 — 반/팀 단위 누적 가로 막대 차트, 행을 누르면 명단 모달.
// 호버 시 나오던 recharts 툴팁은 제거했다 — 행 전체를 덮는 클릭 오버레이가 마우스 이벤트를
// 먼저 받아 도달하지 못하고, 내용(출석/결석 수)도 막대 끝 라벨 "16/22"와 겹쳤다.
"use client";

import { memo, useMemo, useState } from "react";
import { Bar, BarChart, LabelList, Rectangle, XAxis, YAxis, type BarShapeProps } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { AttendanceListModal } from "./AttendanceListModal";
import {
  allMembers,
  countMembers,
  type MemberItem,
  type TopGroup,
} from "@/lib/group-members";

interface GroupAttendanceChartProps {
  group: TopGroup;
  /** id → 기간 내 출석 횟수. 1주 모드에서는 출석자만 1이 들어온다 */
  attendCounts: Map<string, number>;
  /** 분모가 되는 예배 주 수. 1주 모드면 1이라 계산 결과가 단일 날짜 집계와 같아진다 */
  weeks: number;
}

interface ChartRow {
  key: string;
  label: string;
  members: MemberItem[];
}

// 1주 모드는 정수(16/22), 기간 모드는 평균이라 소수 1자리(16.8/22)로 표기
function formatCount(value: number, weeks: number) {
  return weeks === 1 ? String(value) : value.toFixed(1);
}

function renderCountLabel(
  x: unknown,
  y: unknown,
  width: unknown,
  height: unknown,
  row: { 출석: number; 결석: number },
  weeks: number,
) {
  return (
    <text
      x={Number(x) + Number(width) + 6}
      y={Number(y) + Number(height) / 2}
      dy={4}
      fontSize={11}
      className="fill-ink/50 font-medium tabular-nums"
    >
      {formatCount(row.출석, weeks)}/{Math.round(row.출석 + row.결석)}
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
  weeks,
}: {
  chartData: ChartDatum[];
  height: number;
  weeks: number;
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        // 기간 모드는 라벨이 소수점만큼 길어지므로(16.8/22) 오른쪽 여백을 더 준다
        margin={{ left: 0, right: weeks === 1 ? 46 : 58, top: 4, bottom: 4 }}
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
        {/* 클릭은 막대가 아니라 위에 덮은 행 버튼이 받는다(아래 GroupAttendanceChart 주석 참고).
            그래서 여기 막대에는 onClick·cursor를 두지 않는다 */}
        <Bar
          dataKey="출석"
          stackId="a"
          fill="var(--color-출석)"
          radius={[6, 0, 0, 6]}
          barSize={18}
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
              return renderCountLabel(x, y, width, h, row, weeks);
            }}
          />
        </Bar>
        <Bar
          dataKey="결석"
          stackId="a"
          fill="var(--color-결석)"
          barSize={18}
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
              return renderCountLabel(x, y, width, h, row, weeks);
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

export function GroupAttendanceChart({
  group,
  attendCounts,
  weeks,
}: GroupAttendanceChartProps) {
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

  // 기간 모드에서는 '주당 평균 출석 인원'(실수). weeks=1이면 정수라 단일 날짜 집계와 동일하다
  const chartData = useMemo(
    () =>
      rows.map((row) => {
        const sum = row.members.reduce((s, m) => s + (attendCounts.get(m.id) ?? 0), 0);
        const attended = weeks > 0 ? sum / weeks : 0;
        return {
          key: row.key,
          label: row.label,
          출석: attended,
          결석: row.members.length - attended,
        };
      }),
    [rows, attendCounts, weeks],
  );

  const total = countMembers(group);
  const attendedSum = allMembers(group).reduce((s, m) => s + (attendCounts.get(m.id) ?? 0), 0);
  const attendedTotal = weeks > 0 ? attendedSum / weeks : 0;
  const ratio = total === 0 ? 0 : Math.round((attendedTotal / total) * 100);
  const selectedRow = rows.find((r) => r.key === selectedKey) ?? null;

  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className={`font-display text-xl font-bold ${HEADER_COLOR[group.variant]}`}>
          {group.label}
        </h2>
        <span className="font-display text-sm tabular-nums text-ink/40">
          {formatCount(attendedTotal, weeks)} / {total}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[group.variant]}`}
          style={{ width: `${ratio}%` }}
        />
      </div>

      {/*
        클릭 영역을 막대가 아니라 '행 전체'로 잡는다.
        막대에 onClick을 걸면 실제 눌리는 곳이 높이 18px(권장 터치 타깃 44px의 41%)에,
        가로도 인원수에 비례해 차트 폭의 34~59%뿐이라 인원이 적은 반일수록 누르기 어려웠다.
        반 이름(y축 라벨)도 막대 밖이라 반응하지 않았다.

        recharts에 투명 막대를 추가하는 방법은 여기선 못 쓴다 — 이미 stacked Bar 2개가
        한 밴드를 쓰고 있어서 stackId가 다른 Bar를 넣으면 밴드를 나눠 가져 기존 막대가 밀린다.
        그래서 차트 위에 HTML 버튼을 행 수만큼 덮는다. 부수 효과로 키보드 포커스·엔터가 되고
        hover/active 하이라이트도 CSS로 직접 준다.

        top-1/bottom-1 = BarChart margin(top 4, bottom 4)과 같은 값 — 카테고리 밴드가
        그 안쪽에 균등 분배되므로 flex-1로 나누면 행 위치가 정확히 맞는다.
      */}
      <div className="relative mt-3">
        <AttendanceBars
          chartData={chartData}
          height={Math.max(rows.length * 44, 90)}
          weeks={weeks}
        />
        <div className="absolute inset-x-0 top-1 bottom-1 flex flex-col">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => setSelectedKey(row.key)}
              aria-label={`${row.label} 명단 보기`}
              className="flex-1 rounded-lg transition-colors hover:bg-ink/6 focus-visible:ring-2 focus-visible:ring-ink/30 active:bg-ink/12 motion-reduce:transition-none"
            />
          ))}
        </div>
      </div>

      {selectedRow && (
        <AttendanceListModal
          open={!!selectedRow}
          onOpenChange={(o) => {
            if (!o) setSelectedKey(null);
          }}
          title={selectedRow.label}
          members={selectedRow.members}
          attendCounts={attendCounts}
          weeks={weeks}
        />
      )}
    </section>
  );
}
