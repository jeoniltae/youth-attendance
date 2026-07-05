// GradeSection/RosterSection 모양의 로딩 스켈레톤 — 섹션 헤더 + 진행선 + 멤버 카드(필) 그리드
// 출석체크 메인(/)과 교적 관리(/members)에서 공용

import { Skeleton } from "@/components/common/Skeleton";

// 실제 이름 카드처럼 폭을 다양하게 (Tailwind JIT가 인식하도록 정적 클래스 문자열 사용)
const PILL_WIDTHS = ["w-20", "w-16", "w-24", "w-[4.5rem]", "w-20", "w-24", "w-16", "w-[5.5rem]"];

export function GradeSectionSkeleton() {
  return (
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mt-2 h-[3px] w-full rounded-full" />

      <div className="mt-4 flex flex-col gap-4">
        {[0, 1].map((sub) => (
          <div key={sub}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {PILL_WIDTHS.map((width, i) => (
                <Skeleton key={i} className={`h-11 rounded-lg ${width}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
