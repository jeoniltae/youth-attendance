// 학년/반/교사팀/새친구 빠른 필터 칩 목록

import { countMembers, type TopGroup } from "@/lib/group-members";

export type FilterState =
  | { level: "all" }
  | { level: "top"; key: string }
  | { level: "sub"; topKey: string; subKey: string };

interface FilterChipsProps {
  groups: TopGroup[];
  active: FilterState;
  onSelect: (filter: FilterState) => void;
}

function isActive(filter: FilterState, candidate: FilterState): boolean {
  if (filter.level !== candidate.level) return false;
  if (filter.level === "all") return true;
  if (filter.level === "top" && candidate.level === "top")
    return filter.key === candidate.key;
  if (filter.level === "sub" && candidate.level === "sub") {
    return (
      filter.topKey === candidate.topKey && filter.subKey === candidate.subKey
    );
  }
  return false;
}

// 그룹(학년/교사/새친구)별 칩 색상 — GradeSection.tsx의 헤더 색상과 동일한 톤 사용
const TONE_CLASS: Record<"default" | TopGroup["variant"], string> = {
  default:
    "border-ink/20 bg-paper-deep text-ink/70 hover:border-ink/40 hover:text-ink",
  grade:
    "border-ink/15 bg-paper text-ink/70 hover:border-ink/35 hover:text-ink",
  teacher:
    "border-teal/30 bg-paper text-teal/80 hover:border-teal/50 hover:text-teal",
  newFamily:
    "border-gold/30 bg-paper text-gold/80 hover:border-gold/50 hover:text-gold",
  incomplete:
    "border-celebrate/30 bg-paper text-celebrate/80 hover:border-celebrate/50 hover:text-celebrate",
};

// 카테고리 군집을 감싸는 컨테이너 색상
const CLUSTER_CLASS: Record<TopGroup["variant"], string> = {
  grade: "border-ink/15 bg-paper-deep",
  teacher: "border-teal/25 bg-teal/[0.08]",
  newFamily: "border-gold/25 bg-gold/[0.08]",
  incomplete: "border-celebrate/25 bg-celebrate/[0.08]",
};

function Chip({
  label,
  count,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "default" | TopGroup["variant"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-1.5 rounded-full bg-stamp px-3.5 py-1.5 text-sm font-semibold text-stamp-foreground"
          : `flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${TONE_CLASS[tone]}`
      }
    >
      {label}
      <span
        className={
          active
            ? "rounded-full bg-paper/25 px-1.5 text-[0.7rem]"
            : "rounded-full bg-ink/8 px-1.5 text-[0.7rem] text-ink/45"
        }
      >
        {count}
      </span>
    </button>
  );
}

export function FilterChips({ groups, active, onSelect }: FilterChipsProps) {
  const total = groups.reduce((sum, g) => sum + countMembers(g), 0);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Chip
        label="전체"
        count={total}
        active={isActive(active, { level: "all" })}
        onClick={() => onSelect({ level: "all" })}
      />
      {groups.map((group) => (
        <div
          key={group.key}
          className={`flex flex-wrap items-center gap-2 rounded-2xl border px-2.5 py-1.5 ${CLUSTER_CLASS[group.variant]}`}
        >
          <Chip
            label={group.label}
            count={countMembers(group)}
            tone={group.variant}
            active={isActive(active, { level: "top", key: group.key })}
            onClick={() => onSelect({ level: "top", key: group.key })}
          />
          {group.subGroups?.map((sub) => (
            <Chip
              key={sub.key}
              label={sub.label}
              count={sub.members.length}
              tone={group.variant}
              active={isActive(active, {
                level: "sub",
                topKey: group.key,
                subKey: sub.key,
              })}
              onClick={() =>
                onSelect({ level: "sub", topKey: group.key, subKey: sub.key })
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
