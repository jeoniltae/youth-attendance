// 경고 알림 모달 — 네이티브 alert() 대체용.
//
// alert()은 브라우저가 "localhost:3000 says" 같은 문구를 덧붙이고 앱 팔레트와도 겉돌아서,
// 프로젝트의 Dialog 프리미티브 위에 같은 톤(paper/ink)으로 올렸다.
// 확인 버튼 하나뿐인 단방향 알림용 — 선택을 묻는 용도가 아니다.

"use client";

import { TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 라벨-값을 나란히 보여줄 상세 항목 (선택) — 값끼리 세로로 맞아 비교가 쉬워진다 */
  details?: { label: string; value: string }[];
  /** 안내 문구. 줄바꿈이 필요하면 "\n"으로 구분 */
  description?: string;
  confirmLabel?: string;
}

export function AlertDialog({
  open,
  onClose,
  title,
  details,
  description,
  confirmLabel = "확인",
}: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl border-[1.5px] border-ink/15 bg-paper p-6 ring-0 sm:max-w-sm"
      >
        <DialogHeader className="items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-stamp/10">
            <TriangleAlert className="size-5 text-stamp" />
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold text-ink">
            {title}
          </DialogTitle>
        </DialogHeader>

        {details && details.length > 0 && (
          <dl className="flex flex-col gap-1.5 rounded-xl bg-paper-deep px-4 py-3">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-3">
                <dt className="text-xs text-ink/50">{d.label}</dt>
                <dd className="font-display text-sm font-semibold tabular-nums text-ink">
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {description && (
          <p className="break-keep text-center text-sm text-ink/55">
            {description.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="rounded-full bg-ink py-2.5 text-sm font-semibold text-paper hover:bg-ink/85"
        >
          {confirmLabel}
        </button>
      </DialogContent>
    </Dialog>
  );
}
