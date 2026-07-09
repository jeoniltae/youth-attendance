// 학년/교사/새친구 등 상위 그룹과 하위 그룹(반/팀)을 렌더링

import { MemberCard } from "./MemberCard";
import { allMembers, countMembers, type TopGroup } from "@/lib/group-members";

interface GradeSectionProps {
  group: TopGroup;
  attendedIds: Set<string>;
  /** true면 지난 예배 조회 중 — 카드 탭을 막고 잠금 표시 */
  locked?: boolean;
  onToggle: (id: string) => void;
}

const HEADER_COLOR: Record<TopGroup["variant"], string> = {
  grade: "text-ink",
  teacher: "text-teal",
  newFamily: "text-gold",
};

const BAR_COLOR: Record<TopGroup["variant"], string> = {
  grade: "bg-ink",
  teacher: "bg-teal",
  newFamily: "bg-gold",
};

const CARD_VARIANT: Record<
  TopGroup["variant"],
  "default" | "teacher" | "newFamily"
> = {
  grade: "default",
  teacher: "teacher",
  newFamily: "newFamily",
};

export function GradeSection({
  group,
  attendedIds,
  locked = false,
  onToggle,
}: GradeSectionProps) {
  const total = countMembers(group);
  const attended = allMembers(group).filter((m) =>
    attendedIds.has(m.id),
  ).length;
  const ratio = total === 0 ? 0 : Math.round((attended / total) * 100);
  const cardVariant = CARD_VARIANT[group.variant];

  return (
    <section
      className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2
          className={`font-display text-xl font-bold ${HEADER_COLOR[group.variant]}`}
        >
          {group.label}
        </h2>
        <span className="font-display text-sm tabular-nums text-ink/40">
          {attended} / {total}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[group.variant]}`}
          style={{ width: `${ratio}%` }}
        />
      </div>

      {group.subGroups && (
        <div className="mt-4 flex flex-col gap-4">
          {group.subGroups.map((sub) => {
            const subAttended = sub.members.filter((m) =>
              attendedIds.has(m.id),
            ).length;
            return (
              <div key={sub.key}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink/70">
                    {sub.label}
                  </h3>
                  <span className="text-xs tabular-nums text-ink/40">
                    {subAttended} / {sub.members.length}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {sub.members.map((m) => (
                    <MemberCard
                      key={m.id}
                      name={m.name}
                      attended={attendedIds.has(m.id)}
                      variant={cardVariant}
                      locked={locked}
                      onToggle={() => onToggle(m.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {group.members && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {group.members.map((m) => (
            <MemberCard
              key={m.id}
              name={m.name}
              attended={attendedIds.has(m.id)}
              variant={cardVariant}
              locked={locked}
              onToggle={() => onToggle(m.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
