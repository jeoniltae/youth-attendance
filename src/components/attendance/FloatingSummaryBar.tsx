// 스크롤 반응형 플로팅 요약 바 — 본문의 SummaryBar(anchor)가 화면 위로 사라진 뒤
// 아래로 스크롤하면 상단에서 미끄러져 나타나고, 위로 스크롤하면 미끄러져 사라진다.
// 최상단으로 돌아오면 anchor가 다시 보이므로 플로팅 바는 자동으로 숨겨진다.

'use client';

import { useEffect, useState, type RefObject } from 'react';
import { SummaryBar, type SummaryBarProps } from './SummaryBar';

interface FloatingSummaryBarProps extends Omit<SummaryBarProps, 'compact'> {
  /** 본문에 있는 원래 SummaryBar를 감싼 요소 — 이 요소가 화면 위로 벗어났을 때만 플로팅 바가 뜰 수 있음 */
  anchorRef: RefObject<HTMLElement | null>;
}

export function FloatingSummaryBar({ anchorRef, ...barProps }: FloatingSummaryBarProps) {
  const [pastAnchor, setPastAnchor] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);

  // 원래 바가 화면 위로 벗어났는지 감지 (최상단 복귀 시 자동으로 false → 원래 자리 노출)
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPastAnchor(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  // 스크롤 방향 감지 — 내리면 노출, 올리면 숨김
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 2) {
        setScrollingDown(y > lastY);
        lastY = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visible = pastAnchor && scrollingDown;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-[110%]'
      }`}
    >
      <div className="mx-auto w-full max-w-[1368px] px-4 pt-2 sm:px-6 lg:px-8">
        <div className="rounded-2xl shadow-[0_8px_20px_rgba(30,34,51,0.28)]">
          <SummaryBar {...barProps} compact />
        </div>
      </div>
    </div>
  );
}
