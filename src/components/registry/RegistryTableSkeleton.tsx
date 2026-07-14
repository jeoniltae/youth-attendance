// 교적부 로딩 스켈레톤 — RegistryTable(컨트롤바 + sticky 그리드) 모양을 흉내내 자연스러운 전환.
// PC(lg)에서는 실제 테이블과 동일하게 남은 높이를 채운다.

import { Skeleton } from "@/components/common/Skeleton";

// 13열을 비율(fr)로 나눠 컨테이너 폭 100%를 채운다 (번호·학년·반은 좁게, 주소·학교는 넓게)
// Tailwind JIT가 인식하도록 전체 클래스 문자열을 리터럴로 둔다
const GRID_COLS =
  "grid-cols-[0.4fr_0.9fr_0.4fr_0.4fr_0.4fr_1.2fr_1fr_1.1fr_1.1fr_1.6fr_0.5fr_1.2fr_0.7fr]";

export function RegistryTableSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      {/* ── 컨트롤바 ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* 세션 토글 */}
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="h-5 w-px bg-ink/15" />
        {/* 학년 탭 */}
        <div className="flex gap-1.5">
          {["w-12", "w-14", "w-14", "w-14", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-8 rounded-full ${w}`} />
          ))}
        </div>
        {/* 검색 + 카운트 */}
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-full sm:w-48" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
        </div>
      </div>

      {/* ── 그리드 (폭 100% 채움) ── */}
      <div className="overflow-hidden rounded-xl border-[1.5px] border-ink/15 bg-paper lg:min-h-0 lg:flex-1">
        {/* 헤더 밴드 (잉크색) */}
        <div className={`grid ${GRID_COLS} items-center gap-3 bg-ink px-3 py-3`}>
          {Array.from({ length: 13 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4/5 bg-paper/25" />
          ))}
        </div>
        {/* 본문 행 */}
        {Array.from({ length: 12 }).map((_, r) => (
          <div
            key={r}
            className={`grid ${GRID_COLS} items-center gap-3 border-b border-ink/8 px-3 py-3`}
          >
            {Array.from({ length: 13 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-4/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
