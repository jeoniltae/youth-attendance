// 전체/출석/출석률 요약 통계 바 — 잉크 색 점수판 스타일

interface SummaryBarProps {
  total: number;
  attended: number;
}

export function SummaryBar({ total, attended }: SummaryBarProps) {
  const rate = total === 0 ? 0 : Math.round((attended / total) * 100);

  const stats = [
    { label: '전체', value: String(total) },
    { label: '출석', value: String(attended) },
    { label: '출석률', value: `${rate}%` },
  ];

  return (
    <div className="flex divide-x divide-paper/15 overflow-hidden rounded-2xl bg-ink">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-1 flex-col items-center gap-0.5 px-4 py-4">
          <span className="font-display text-[0.65rem] tracking-[0.25em] text-paper/55">{stat.label}</span>
          <span className="font-display text-2xl font-bold tabular-nums text-paper">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
