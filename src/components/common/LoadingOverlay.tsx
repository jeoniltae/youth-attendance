// 저장/삭제 처리 중 팝업 전체를 덮는 로딩 오버레이 — 버튼 내부 텍스트 로딩 표시와 별개로
// 화면 중앙에 더 눈에 띄는 스피너를 보여줌. 부모(팝업)가 position:fixed/relative이면
// absolute inset-0로 그 영역 전체를 덮는다.

"use client";

import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  label?: string;
  className?: string;
}

export function LoadingOverlay({
  label = "처리 중…",
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-paper/40 backdrop-blur-[2px] ${className ?? ""}`}
    >
      <Loader2 className="size-10 animate-spin text-ink/70" strokeWidth={2.5} />
      <p className="text-sm font-semibold text-ink/70">{label}</p>
    </div>
  );
}
