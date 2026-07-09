// 세션(오전/오후) 선택과 대상 예배일을 표시하는 공통 헤더 — 티켓 스텁 스타일

import { formatDateLabel, parseInputDate } from '@/lib/date';
import type { Session } from '@/types';

interface HeaderProps {
  session: Session;
  onSessionChange: (session: Session) => void;
  /** 화면이 실제로 다루는 날짜('YYYY-MM-DD') — 출석 조회/토글 대상과 항상 일치해야 함 */
  date: string;
  lastUpdated?: string | null;
  actions?: React.ReactNode;
}

const SESSIONS: Session[] = ['오전', '오후'];

export function Header({ session, onSessionChange, date, lastUpdated, actions }: HeaderProps) {
  const dateLabel = formatDateLabel(parseInputDate(date));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-paper-deep shadow-[0_2px_0_rgba(30,34,51,0.08)] lg:flex-row lg:items-stretch lg:justify-between">
      <div className="flex flex-wrap items-stretch">
        <div className="flex flex-col items-center justify-center gap-1 px-6 py-3">
          <span className="font-display text-[0.65rem] tracking-[0.2em] text-ink/50">DATE</span>
          <span className="rounded-full border border-dashed border-ink/30 px-3 py-1 font-display text-sm font-semibold tracking-wide text-ink">
            {dateLabel}
          </span>
          {lastUpdated && (
            <span className="text-[0.65rem] text-ink/40">업데이트 {lastUpdated}</span>
          )}
        </div>
        <div className="w-px shrink-0 self-stretch bg-[repeating-linear-gradient(to_bottom,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)] opacity-20" />
        <div className="flex items-center gap-2 px-5 py-3 sm:max-lg:ml-auto">
          <span className="font-display text-[0.65rem] tracking-[0.2em] text-ink/50">예배</span>
          <div className="flex gap-1.5">
            {SESSIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSessionChange(s)}
                className={
                  s === session
                    ? 'rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper'
                    : 'rounded-full border border-ink/25 px-4 py-1.5 text-sm font-medium text-ink/60 hover:border-ink/50 hover:text-ink'
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-dashed border-ink/15 px-5 py-3 lg:w-auto lg:justify-start lg:border-t-0 lg:border-l">
          {actions}
        </div>
      )}
    </div>
  );
}
