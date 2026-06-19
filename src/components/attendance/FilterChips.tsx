// 학년/반/교사팀/새가족 빠른 필터 칩 목록

import { countMembers, type TopGroup } from '@/lib/group-members';

export type FilterState =
  | { level: 'all' }
  | { level: 'top'; key: string }
  | { level: 'sub'; topKey: string; subKey: string };

interface FilterChipsProps {
  groups: TopGroup[];
  active: FilterState;
  onSelect: (filter: FilterState) => void;
}

function isActive(filter: FilterState, candidate: FilterState): boolean {
  if (filter.level !== candidate.level) return false;
  if (filter.level === 'all') return true;
  if (filter.level === 'top' && candidate.level === 'top') return filter.key === candidate.key;
  if (filter.level === 'sub' && candidate.level === 'sub') {
    return filter.topKey === candidate.topKey && filter.subKey === candidate.subKey;
  }
  return false;
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex items-center gap-1.5 rounded-full bg-stamp px-3.5 py-1.5 text-sm font-semibold text-stamp-foreground'
          : 'flex items-center gap-1.5 rounded-full border border-ink/20 bg-paper-deep px-3.5 py-1.5 text-sm font-medium text-ink/70 hover:border-ink/40 hover:text-ink'
      }
    >
      {label}
      <span
        className={
          active
            ? 'rounded-full bg-paper/25 px-1.5 text-[0.7rem]'
            : 'rounded-full bg-ink/8 px-1.5 text-[0.7rem] text-ink/45'
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
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        label="전체"
        count={total}
        active={isActive(active, { level: 'all' })}
        onClick={() => onSelect({ level: 'all' })}
      />
      {groups.map((group) => (
        <div key={group.key} className="flex flex-wrap items-center gap-2">
          <Chip
            label={group.label}
            count={countMembers(group)}
            active={isActive(active, { level: 'top', key: group.key })}
            onClick={() => onSelect({ level: 'top', key: group.key })}
          />
          {group.subGroups?.map((sub) => (
            <Chip
              key={sub.key}
              label={sub.label}
              count={sub.members.length}
              active={isActive(active, { level: 'sub', topKey: group.key, subKey: sub.key })}
              onClick={() => onSelect({ level: 'sub', topKey: group.key, subKey: sub.key })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
