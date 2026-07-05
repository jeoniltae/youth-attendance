// 로딩 스켈레톤 프리미티브 — 페이지별 스켈레톤이 공통으로 사용하는 pulse 박스
// 어두운 배경(잉크색 점수판 등) 위에서는 className으로 bg-paper/20 등을 덮어쓴다

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-ink/8", className)} />;
}
