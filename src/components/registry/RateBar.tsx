// 출석률(1년기준) 셀 시각화 — 숫자만으로는 한눈에 안 들어와서 미니 막대 + 색상 코딩을 함께 표시.
// 80%↑ teal(양호) / 50~79% gold(보통) / 50%↓ stamp(주의) — 프로젝트 팔레트 그대로 사용.

const tone = (v: number) =>
  v >= 80 ? "bg-teal" : v >= 50 ? "bg-gold" : "bg-stamp";

export function RateBar({ value }: { value: number }) {
  // 데이터가 이상해도 막대가 넘치지 않도록 0~100으로 고정
  const width = Math.max(0, Math.min(100, value));

  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-ink/10">
        <span
          className={`block h-full rounded-full ${tone(value)}`}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="tabular-nums text-xs font-semibold text-ink/70">{value}%</span>
    </span>
  );
}
