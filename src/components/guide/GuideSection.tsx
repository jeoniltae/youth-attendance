"use client";
// 사용 안내 절(section)·작은 주제 — 머리를 누르면 펼치고 접는다. 접힌 동안은 본문(캡처 포함)을 그리지 않는다.
// 펼침 상태는 페이지가 한곳에서 관리하고(GuideOpenContext) 고정 내비·대상 카드·주소 앵커가 함께 쓴다.

import { createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuideOpenState {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
}

export const GuideOpenContext = createContext<GuideOpenState>({
  isOpen: () => true,
  toggle: () => {},
});

// 고정 내비(모바일 칩 줄) 높이만큼 앵커 이동 위치를 내린다 — lg 이상은 왼쪽 목차라 위가 비어 있다
const SCROLL_MARGIN = "scroll-mt-20 lg:scroll-mt-6";

interface GuideSectionProps {
  /** 내비·카드·주소 앵커가 가리키는 id */
  id: string;
  tag: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function GuideSection({ id, tag, title, description, children }: GuideSectionProps) {
  const { isOpen, toggle } = useContext(GuideOpenContext);
  const open = isOpen(id);

  return (
    <section id={id} className={cn("border-b border-ink/12", SCROLL_MARGIN)}>
      {/* 제목(h2) 안에 버튼 — 버튼 안에는 제목 태그를 넣을 수 없고, 이렇게 해야 화면 읽기 프로그램의 제목 이동으로 절을 찾는다 */}
      <h2>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={open}
          // 접힌 동안은 패널을 그리지 않으므로 펼쳤을 때만 가리킨다(없는 id를 가리키지 않게)
          aria-controls={open ? `${id}-panel` : undefined}
          className="flex w-full items-center gap-3 py-3.5 text-left sm:py-5"
        >
          <span className="grid min-w-0 flex-1 gap-1">
            <span className="text-xs font-semibold tracking-[0.12em] text-ink/55">{tag}</span>
            <span className="font-display text-xl font-bold text-ink sm:text-[1.75rem]">{title}</span>
            {/* 모바일에서 접힌 절은 제목만 — 첫 화면에 절 목록이 한 번에 보이게. 펼치면 설명도 보인다 */}
            {description ? <span className={cn("text-ink/60", !open && "hidden sm:block")}>{description}</span> : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-6 shrink-0 text-ink/50 transition-transform motion-reduce:transition-none", open && "rotate-180")}
          />
        </button>
      </h2>
      {open ? (
        <div id={`${id}-panel`} className="pb-8">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** 한 절 안의 작은 주제(학생 관리의 들어가기·등록하기 등) — 절과 같은 방식으로 접힌다 */
export function GuideSubSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isOpen, toggle } = useContext(GuideOpenContext);
  const open = isOpen(id);

  return (
    <div id={id} className={cn("mt-3", SCROLL_MARGIN)}>
      <h3>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={open}
          aria-controls={open ? `${id}-panel` : undefined}
          className="flex min-h-12 w-full items-center gap-2 rounded-lg bg-paper-deep px-3 py-2 text-left font-display text-lg font-bold text-ink"
        >
          <span className="flex-1">{title}</span>
          <ChevronDown
            aria-hidden
            className={cn("size-5 shrink-0 text-ink/50 transition-transform motion-reduce:transition-none", open && "rotate-180")}
          />
        </button>
      </h3>
      {open ? <div id={`${id}-panel`}>{children}</div> : null}
    </div>
  );
}
