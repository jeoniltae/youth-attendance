// 출석 토글 버튼 (학생/교사 공통) — 클릭 시 출석/미출석 상태 토글, 출석 순간 스탬프 효과 재생

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

interface MemberCardProps {
  name: string;
  attended: boolean;
  variant?: 'default' | 'teacher' | 'newFamily';
  onToggle: () => void;
}

const IDLE_STYLE: Record<NonNullable<MemberCardProps['variant']>, string> = {
  default: 'border-ink/25 text-ink hover:border-ink/45',
  teacher: 'border-teal/50 text-teal hover:border-teal/80',
  newFamily: 'border-gold/60 text-gold hover:border-gold',
};

export function MemberCard({ name, attended, variant = 'default', onToggle }: MemberCardProps) {
  const [justStamped, setJustStamped] = useState(false);
  const prevAttended = useRef(attended);

  useEffect(() => {
    if (attended && !prevAttended.current) {
      setJustStamped(true);
      const timer = setTimeout(() => setJustStamped(false), 320);
      prevAttended.current = attended;
      return () => clearTimeout(timer);
    }
    prevAttended.current = attended;
  }, [attended]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`ticket-notch min-h-11 rounded-lg border-[1.5px] bg-paper px-4 py-2 text-sm font-medium transition-all ${
        attended
          ? `rotate-[-1.5deg] border-stamp bg-stamp text-stamp-foreground ${
              justStamped ? 'animate-[stamp-down_320ms_ease-out]' : ''
            }`
          : `${IDLE_STYLE[variant]} hover:-translate-y-0.5 hover:bg-paper-deep`
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {name}
        {attended && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
