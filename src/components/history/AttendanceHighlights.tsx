// 기간 모드 전용 — 기간 내 개근/부분 출석/결석 인원을 칩으로 요약. 누르면 명단 모달을 띄운다.
// 모달은 AttendanceListModal을 그대로 재사용한다(기간 모드 렌더가 이미 들어 있음).
//
// 세 칩이 명단 전체를 빠짐없이 나눈다(개근 + 부분 + 결석 = 명단 인원). 양 끝만 두면
// 중간이 통째로 요약에서 사라지는데, 그 비중이 작지 않다 — 4주 33%, 8주 48%.

"use client";

import { useState } from "react";
import { Award, CircleDashed, TriangleAlert, type LucideIcon } from "lucide-react";
import { AttendanceListModal } from "./AttendanceListModal";
import type { MemberItem } from "@/lib/group-members";

// 색은 화면 다른 곳과 같은 의미 — 개근 teal / 중간 gold(교적부 RateBar의 중간 대역) / 결석 stamp
const TONE = {
  teal: {
    chip: "border-teal/40 bg-teal/10 hover:border-teal disabled:hover:border-teal/40",
    icon: "text-teal",
  },
  gold: {
    chip: "border-gold/40 bg-gold/10 hover:border-gold disabled:hover:border-gold/40",
    icon: "text-gold",
  },
  stamp: {
    chip: "border-stamp/40 bg-stamp/10 hover:border-stamp disabled:hover:border-stamp/40",
    icon: "text-stamp",
  },
} as const;

/**
 * 모바일에서 세 칩이 한 줄에 들어가야 해서 좁은 화면에서는 패딩·글자를 줄이고 "명"을 감춘다.
 * 375px 기준 가용폭 328px인데, 세 칸 모두 세 자리 수(999)일 때
 * 패딩·글자만 줄이면 342px로 넘치고 "명"까지 빼면 307px가 되어 들어간다.
 * sm 이상에서는 여유가 충분하므로 원래 크기와 "명"을 되살린다.
 *
 * 어포던스: 바로 위 조회 구간 배지가 같은 모양(둥근 pill + 틴트)인데 누를 수 없어서,
 * 가만히 있으면 라벨로 읽힌다. 그래서 그림자로 살짝 띄우고 누르면 내려앉게 한다 —
 * MemberCard가 쓰는 표현과 같다. hover는 터치에 없으므로 active(눌림)가 핵심이다.
 * box-shadow·transform은 레이아웃 폭을 바꾸지 않아 한 줄 배치에 영향이 없다.
 */
function HighlightChip({
  tone,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  tone: keyof typeof TONE;
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={`flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-ink tabular-nums shadow-[0_2px_0_rgba(30,34,51,0.12)] transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink/40 active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:transition-none sm:gap-1.5 sm:px-3.5 sm:text-sm ${TONE[tone].chip}`}
    >
      <Icon className={`size-3.5 shrink-0 ${TONE[tone].icon}`} strokeWidth={2.5} />
      {/* 라벨·숫자·"명"은 한 덩어리로 묶는다 — 버튼이 flex라 따로 두면 각각 플렉스 아이템이
          되어 gap이 "29 명"처럼 끼어들고, inline도 block으로 승격된다 */}
      <span>
        {label} {count}
        <span className="hidden sm:inline">명</span>
      </span>
    </button>
  );
}

interface AttendanceHighlightsProps {
  /** 이 세션 전체 인원(학생+교사) */
  members: MemberItem[];
  attendCounts: Map<string, number>;
  weeks: number;
}

export function AttendanceHighlights({
  members,
  attendCounts,
  weeks,
}: AttendanceHighlightsProps) {
  const [openKey, setOpenKey] = useState<"perfect" | "partial" | "none" | null>(null);

  if (weeks < 2) return null;

  const perfect = members.filter((m) => (attendCounts.get(m.id) ?? 0) === weeks);
  const none = members.filter((m) => (attendCounts.get(m.id) ?? 0) === 0);
  const partial = members.filter((m) => {
    const c = attendCounts.get(m.id) ?? 0;
    return c > 0 && c < weeks;
  });

  // 2주면 중간이 1회뿐이라 "1~1회"가 되지 않게 한다
  const partialRange = weeks === 2 ? "1회" : `1~${weeks - 1}회`;

  const selected =
    openKey === "perfect"
      ? { title: `개근 (${weeks}주 전체 출석)`, list: perfect }
      : openKey === "partial"
        ? { title: `부분 출석 (${weeks}주 중 ${partialRange})`, list: partial }
        : openKey === "none"
          ? { title: `결석 (${weeks}주 중 0회)`, list: none }
          : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <HighlightChip
          tone="teal"
          icon={Award}
          label="개근"
          count={perfect.length}
          onClick={() => setOpenKey("perfect")}
        />
        <HighlightChip
          tone="gold"
          icon={CircleDashed}
          label="부분 출석"
          count={partial.length}
          onClick={() => setOpenKey("partial")}
        />
        <HighlightChip
          tone="stamp"
          icon={TriangleAlert}
          label="결석"
          count={none.length}
          onClick={() => setOpenKey("none")}
        />
      </div>

      {/* 추이 차트의 "차트를 누르면 그 주만 보기"와 같은 결의 안내 — 터치에는 hover가
          없어서 시각 효과만으로는 부족하다 */}
      <p className="text-xs text-ink/75">💡각 버튼을 누르면 해당 인원 명단 확인이 가능합니다</p>

      {selected && (
        <AttendanceListModal
          open
          onOpenChange={(o) => {
            if (!o) setOpenKey(null);
          }}
          title={selected.title}
          members={selected.list}
          attendCounts={attendCounts}
          weeks={weeks}
        />
      )}
    </div>
  );
}
