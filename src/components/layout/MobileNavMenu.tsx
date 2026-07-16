"use client";
// 모바일 전용 컴팩트 내비 메뉴 — 햄버거 버튼 탭 시 색 강조바+아이콘+라벨 세로 리스트 팝오버 노출
// 헤더 티켓 컨테이너가 overflow-hidden + 조상에 rise-in transform이 남아 있어(containing block)
// 패널을 내부에 두면 잘리므로 createPortal로 body에 띄우고 버튼 위치 기준 fixed 좌표를 쓴다.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface MobileNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** 좌측 강조바 색 (예: "bg-celebrate") */
  barClass: string;
  /** 아이콘 색 (예: "text-celebrate") */
  iconClass: string;
  /** 링크 이동 항목이면 href, 동작 항목이면 onClick */
  href?: string;
  onClick?: () => void;
}

export function MobileNavMenu({ items }: { items: MobileNavItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  // 바깥 탭 시 닫기 + 스크롤/리사이즈로 버튼 위치가 변하면 그냥 닫음(고정 좌표라 따라가지 못함)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const rowClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-ink/5";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        onClick={toggleOpen}
        // 열리면 잉크색으로 채워 열림 상태를 명확히 — 선은 bg-current라 함께 종이색(X)이 된다
        className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 motion-reduce:transition-none ${
          open
            ? "border-ink bg-ink text-paper"
            : "border-ink/25 text-ink/70 hover:border-ink/50 hover:text-ink"
        }`}
      >
        {/* 햄버거 ↔ X 모핑 — 3개 선을 직접 그려 transform만 애니메이션(가볍고 부드럽다).
            열리면 위/아래 선이 가운데로 모이며 45도로 교차해 X가 되고, 가운데 선은 사라진다.
            선 색은 bg-current라 버튼의 hover 색 변화를 그대로 따라간다. */}
        <span aria-hidden className="relative block size-5">
          <span
            className={`absolute left-1/2 top-1/2 -ml-2 -mt-px h-[2px] w-4 rounded-full bg-current transition-transform duration-300 ease-out motion-reduce:transition-none ${
              open ? "rotate-45" : "translate-y-[-5px]"
            }`}
          />
          <span
            className={`absolute left-1/2 top-1/2 -ml-2 -mt-px h-[2px] w-4 rounded-full bg-current transition-opacity duration-200 ease-out motion-reduce:transition-none ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-1/2 top-1/2 -ml-2 -mt-px h-[2px] w-4 rounded-full bg-current transition-transform duration-300 ease-out motion-reduce:transition-none ${
              open ? "-rotate-45" : "translate-y-[5px]"
            }`}
          />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            // origin-top-right — 패널의 우상단이 곧 버튼 자리라, 그 지점에서 자라나오듯 보인다
            className="fixed z-50 min-w-44 origin-top-right rounded-2xl border border-ink/10 bg-paper p-2 shadow-[0_12px_32px_rgba(30,34,51,0.18)] animate-[pop-from-anchor_0.18s_ease-out] motion-reduce:animate-none"
            style={{ top: pos.top, right: pos.right }}
          >
            {items.map((item) => {
              const content = (
                <>
                  <span className={`h-5 w-[3px] rounded-full ${item.barClass}`} />
                  <item.icon className={`size-4 ${item.iconClass}`} />
                  <span className="text-sm font-semibold text-ink">{item.label}</span>
                </>
              );
              return item.href ? (
                <Link
                  key={item.key}
                  href={item.href}
                  className={rowClass}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
