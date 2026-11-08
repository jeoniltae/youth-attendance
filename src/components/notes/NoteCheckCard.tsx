// 말씀노트 체크 카드 — 세로 명단 한 줄 전체가 토글. 결석한 학생은 흐리게 표시하지만 체크는 가능하다

import { Check } from "lucide-react";

interface NoteCheckCardProps {
  name: string;
  written: boolean;
  present: boolean;
  onToggle: () => void;
}

export function NoteCheckCard({ name, written, present, onToggle }: NoteCheckCardProps) {
  return (
    <button
      type="button"
      aria-pressed={written}
      onClick={onToggle}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-[10px] border-[1.5px] py-2 pr-3 pl-4 text-left font-medium transition-colors ${
        written ? "border-stamp bg-stamp/10" : "border-ink/20 bg-paper hover:bg-paper-deep"
      } ${!present && !written ? "opacity-55" : ""}`}
    >
      <span className="inline-flex items-center gap-2">
        {name}
        {!present && (
          <span className="rounded-full bg-ink/10 px-2 py-px text-xs font-normal">결석</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`flex size-8 flex-none items-center justify-center rounded-full border-[1.5px] ${
          written ? "rotate-[-8deg] border-stamp bg-stamp text-stamp-foreground" : "border-ink/30"
        }`}
      >
        {written && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  );
}
