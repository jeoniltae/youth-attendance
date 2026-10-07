// 사용 안내 자주 묻는 것 — 네이티브 <details>로 접고 펼친다(별도 상태 없음)
// summary를 flex로 두면 PC 크롬은 기본 ▶ 표시를 그리지 않고 모바일 사파리는 그려서 브라우저마다 달라진다
// → 기본 표시는 모두 숨기고 절 머리와 같은 ChevronDown을 직접 그린다(펼치면 group-open으로 회전)
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export function GuideFaq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-4 grid gap-2.5">
      {items.map((item) => (
        <details key={item.q} className="group rounded-2xl bg-paper-deep px-4">
          <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{item.q}</span>
            <ChevronDown
              aria-hidden
              className="size-5 shrink-0 text-ink/50 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="pb-4 text-ink/65">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
