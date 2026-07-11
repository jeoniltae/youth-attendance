// 세션(오전/오후) 선택과 대상 예배일을 표시하는 공통 헤더 — 티켓 스텁 스타일

import { formatDateLabel, getTodayInSeoul, parseInputDate } from '@/lib/date';
import { LiveClock } from '@/components/common/LiveClock';
import type { Session } from '@/types';

interface HeaderProps {
  session: Session;
  onSessionChange: (session: Session) => void;
  /** 화면이 실제로 다루는 날짜('YYYY-MM-DD') — 출석 조회/토글 대상과 항상 일치해야 함 */
  date: string;
  actions?: React.ReactNode;
  /** 모바일 전용 내비 메뉴(햄버거). 전달하면 모바일에서 예배 토글이 둘째 줄로 내려가
      메뉴와 나란히 배치되고 actions는 sm 이상에서만 노출된다. 미전달 시 기존 레이아웃 그대로 */
  mobileMenu?: React.ReactNode;
}

const SESSIONS: Session[] = ['오전', '오후'];

export function Header({ session, onSessionChange, date, actions, mobileMenu }: HeaderProps) {
  const checkDateLabel = formatDateLabel(parseInputDate(date));
  const todayLabel = formatDateLabel(getTodayInSeoul());

  const sessionToggle = (
    <div className="flex items-center gap-2">
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
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-paper-deep shadow-[0_2px_0_rgba(30,34,51,0.08)] lg:flex-row lg:items-stretch lg:justify-between">
      <div className="flex flex-wrap items-stretch">
        {/* mobileMenu 레이아웃의 모바일에서는 상단 줄을 반반으로 나눠 왼쪽에 출석일,
            오른쪽에 DATE를 각각 가운데 정렬하고 사이에 세로 점선을 둔다(티켓 컨셉).
            sm 이상에서는 반반 래퍼가 sm:contents로 사라져 기존 인라인 배치로 복귀 */}
        <div
          className={
            mobileMenu
              ? 'flex w-full items-stretch px-3 py-3 sm:w-auto sm:items-center sm:gap-3 sm:px-5'
              : 'flex items-center gap-3 px-3 py-3 sm:px-5'
          }
        >
          <div className={mobileMenu ? 'flex flex-1 items-center justify-center sm:contents' : 'contents'}>
            {/* 출석체크 대상 날짜(최근 일요일) — 스탬프색 박스로 강조해 "체크되는 날짜"임을 표시 */}
            <div className="flex flex-col items-center gap-0.5 rounded-xl border-[1.5px] border-stamp/35 bg-stamp/8 px-3 py-1.5">
              <span className="font-display text-[0.6rem] tracking-[0.15em] text-stamp/70">출석일</span>
              <span className="whitespace-nowrap font-display text-sm font-bold text-stamp">
                {checkDateLabel}
              </span>
            </div>
          </div>
          {mobileMenu && (
            <div className="w-px shrink-0 bg-[repeating-linear-gradient(to_bottom,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)] opacity-20 sm:hidden" />
          )}
          <div className={mobileMenu ? 'flex flex-1 items-center justify-center sm:contents' : 'contents'}>
            {/* 오늘 실제 날짜 — 참고 정보. 기존 레이아웃은 모바일 상단 줄이 좁아 숨기지만,
                mobileMenu 레이아웃은 예배 토글이 둘째 줄로 내려가 공간이 남으므로 모바일에도 노출 */}
            <div className={`flex-col gap-0.5 ${mobileMenu ? 'flex' : 'hidden sm:flex'}`}>
              <span className="font-display text-[12px] tracking-[0.2em] text-ink/50">DATE</span>
              <span className="whitespace-nowrap font-display text-sm font-semibold text-ink">
                {todayLabel}
              </span>
              <LiveClock className="text-[12px] font-semibold text-teal" />
            </div>
          </div>
        </div>
        <div
          className={`w-px shrink-0 self-stretch bg-[repeating-linear-gradient(to_bottom,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)] opacity-20 ${
            mobileMenu ? 'hidden sm:block' : ''
          }`}
        />
        <div
          className={`items-center gap-2 px-3 py-3 sm:px-5 sm:max-lg:ml-auto ${
            mobileMenu ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {sessionToggle}
        </div>
      </div>

      {/* 모바일 전용 둘째 줄 — 예배 토글(좌) + 햄버거 메뉴(우) */}
      {mobileMenu && (
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-ink/15 px-3 py-3 sm:hidden">
          {sessionToggle}
          {mobileMenu}
        </div>
      )}

      {actions && (
        <div
          className={`w-full flex-wrap items-center justify-between gap-2 border-t border-dashed border-ink/15 px-5 py-3 lg:w-auto lg:justify-start lg:border-t-0 lg:border-l ${
            mobileMenu ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
