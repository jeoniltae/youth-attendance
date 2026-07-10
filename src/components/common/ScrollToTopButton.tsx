// 전체 화면 공통 우측 하단 TOP 버튼 — 일정 이상 스크롤하면 나타나고 클릭 시 최상단으로 부드럽게 이동

"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed right-4 bottom-5 z-30 flex size-11 items-center justify-center rounded-full bg-ink text-paper shadow-[0_8px_20px_rgba(30,34,51,0.28)] transition-all duration-300 ease-out hover:bg-ink/85 sm:right-8 sm:bottom-8 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="size-5" strokeWidth={2.5} />
    </button>
  );
}
