"use client";
// 사용 안내 고정 내비 — 모바일은 상단 고정 칩 한 줄(가로로 밀기), lg 이상은 왼쪽 고정 목차(작은 주제 포함).
// 누르면 onGo가 접힌 절을 펼치고 그 위치로 스크롤한다. 지금 보고 있는 절(activeId)을 강조한다.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GuideNavItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface GuideNavProps {
  items: GuideNavItem[];
  activeId: string | null;
  onGo: (id: string) => void;
}

/** 모바일(lg 미만) — 본문 위에 붙는 칩 줄 */
export function GuideNavBar({ items, activeId, onGo }: GuideNavProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  // 강조 칩이 가로 스크롤 밖에 있으면 보이는 곳으로 — 페이지 세로 위치는 건드리지 않는다
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-nav="${activeId}"]`);
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [activeId]);

  return (
    <nav
      aria-label="사용 안내 목차"
      className="sticky top-0 z-20 -mx-4 border-b border-ink/12 bg-paper/95 backdrop-blur sm:-mx-6 lg:hidden"
    >
      <div ref={rowRef} className="flex gap-2 overflow-x-auto px-4 py-2.5 [&::-webkit-scrollbar]:hidden sm:px-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-nav={item.id}
            onClick={() => onGo(item.id)}
            aria-current={activeId === item.id ? "location" : undefined}
            className={cn(
              "shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap",
              activeId === item.id ? "border-ink bg-ink text-paper" : "border-ink/25 text-ink/75",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** lg 이상 — 본문 왼쪽 고정 목차 */
export function GuideNavSide({ items, activeId, onGo }: GuideNavProps) {
  return (
    <nav aria-label="사용 안내 목차" className="sticky top-6 hidden self-start lg:block">
      <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-ink/50">목차</p>
      <ul className="grid gap-0.5 border-l border-ink/15">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onGo(item.id)}
              aria-current={activeId === item.id ? "location" : undefined}
              className={cn(
                "-ml-px w-full border-l-2 py-1.5 pl-3 text-left text-sm font-semibold",
                activeId === item.id ? "border-stamp text-ink" : "border-transparent text-ink/55 hover:text-ink",
              )}
            >
              {item.label}
            </button>
            {item.children ? (
              <ul className="mb-1 grid">
                {item.children.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onGo(c.id)}
                      className="w-full py-1 pl-6 text-left text-[13px] text-ink/50 hover:text-ink"
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
