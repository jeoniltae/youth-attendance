// GroupAttendanceChart 모양의 로딩 스켈레톤 — 섹션 헤더 + 진행선 + 가로 막대 4개

import { Skeleton } from "@/components/common/Skeleton";

const BAR_WIDTHS = ["w-[85%]", "w-[60%]", "w-[75%]", "w-[50%]"];

export function GroupAttendanceChartSkeleton() {
  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="mt-2 h-[3px] w-full rounded-full" />

      <div className="mt-4 flex flex-col gap-4">
        {BAR_WIDTHS.map((width, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-12 shrink-0" />
            <Skeleton className={`h-[18px] rounded-md ${width}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
