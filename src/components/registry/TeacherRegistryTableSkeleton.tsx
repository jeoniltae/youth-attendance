// 교사 교적부 로딩 스켈레톤 — TeacherRegistryTable(컨트롤바 + 그리드) 모양. 폭 100% 채움.

import { Skeleton } from "@/components/common/Skeleton";

// 8열 비율(fr) — Tailwind JIT 인식용 리터럴
const GRID_COLS =
  "grid-cols-[0.4fr_0.8fr_1fr_1.1fr_1fr_1.6fr_0.8fr_1.2fr]";

export function TeacherRegistryTableSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* ── 컨트롤바 ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="h-5 w-px bg-ink/15" />
        <div className="flex gap-1.5">
          {["w-12", "w-16", "w-20", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-8 rounded-full ${w}`} />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-full sm:w-48" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
        </div>
      </div>

      {/* ── 그리드 (폭 100% 채움) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border-[1.5px] border-ink/15 bg-paper">
        {/* 헤더 밴드 — 실제 테이블과 동일한 담백한 톤(paper-deep + 하단 잉크 라인) */}
        <div
          className={`grid ${GRID_COLS} items-center gap-3 border-b-2 border-ink bg-paper-deep px-3 py-3`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4/5 bg-ink/15" />
          ))}
        </div>
        {Array.from({ length: 12 }).map((_, r) => (
          <div
            key={r}
            className={`grid ${GRID_COLS} items-center gap-3 border-b border-ink/8 px-3 py-3`}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-4/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
