// WeeklyTrendChart 모양의 로딩 스켈레톤 — 헤더 + 면적 실루엣(평균선 포함) + x축 라벨 + 범례
//
// 실제 차트와 같은 섹션 껍데기·높이(h-40)를 써서 데이터가 도착해도 레이아웃이 밀리지 않는다.
// 막대가 아니라 면적 차트이므로, GroupAttendanceChartSkeleton처럼 막대를 늘어놓지 않고
// 바닥에 깔린 덩어리 하나로 면적을 암시한다.

import { Skeleton } from "@/components/common/Skeleton";

const TICKS = 6;

export function WeeklyTrendChartSkeleton() {
  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* h-7 = 실제 h2(text-lg) 줄높이 28px와 동일 — 데이터 도착 시 밀리지 않게 */}
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-3.5 w-32" />
      </div>

      {/* flex-1로 남는 높이를 채워 전체가 정확히 h-40이 되게 한다 (실제 차트와 동일) */}
      <div className="mt-3 flex h-40 w-full flex-col">
        <div className="relative flex-1">
          {/* 평균선 자리 — 실제 차트의 점선과 같은 결. 구조 힌트라 pulse는 주지 않는다 */}
          <div className="absolute inset-x-0 top-[42%] border-t border-dashed border-ink/15" />
          <Skeleton className="absolute inset-x-0 bottom-0 h-[55%] rounded-t-2xl" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          {Array.from({ length: TICKS }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-7" />
          ))}
        </div>
      </div>

      {/* h-4.75 = 19px, 실제 범례 줄(text-xs + 아이콘) 높이 */}
      <div className="mt-2 flex h-4.75 items-center justify-end gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </section>
  );
}
