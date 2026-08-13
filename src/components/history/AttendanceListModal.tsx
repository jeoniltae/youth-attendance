// 반/팀 단위 명단 모달.
// 1주 모드: 출석자/결석자 두 묶음의 이름 칩.
// 기간 모드: 출석 횟수 내림차순 개인별 목록(n/N회 + 출석률 막대) — 여러 주를 묶어 보면
//            '출석/결석' 2분류로는 아무것도 알 수 없기 때문.

import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RateBar } from '@/components/registry/RateBar';
import type { MemberItem } from '@/lib/group-members';

interface AttendanceListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  members: MemberItem[];
  /** id → 기간 내 출석 횟수 */
  attendCounts: Map<string, number>;
  /** 분모가 되는 예배 주 수. 1이면 단일 날짜 모드 */
  weeks: number;
}

export function AttendanceListModal({
  open,
  onOpenChange,
  title,
  members,
  attendCounts,
  weeks,
}: AttendanceListModalProps) {
  const isRange = weeks > 1;

  const attended = members.filter((m) => (attendCounts.get(m.id) ?? 0) > 0);
  const absent = members.filter((m) => (attendCounts.get(m.id) ?? 0) === 0);

  // 기간 모드: 출석 횟수 많은 순 → 같으면 이름순
  const ranked = isRange
    ? [...members].sort((a, b) => {
        const diff = (attendCounts.get(b.id) ?? 0) - (attendCounts.get(a.id) ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
      })
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl border-[1.5px] border-ink/15 bg-paper p-5 ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            {title}
            <span className="ml-2 text-sm font-medium text-ink/40">
              {isRange
                ? `${weeks}주 · ${members.length}명`
                : `출석 ${attended.length} / ${members.length}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isRange ? (
          <ul className="flex flex-col divide-y divide-ink/8">
            {ranked.map((m) => {
              const count = attendCounts.get(m.id) ?? 0;
              return (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {m.name}
                  </span>
                  <span className="shrink-0 font-display text-sm tabular-nums text-ink/50">
                    {count}/{weeks}
                  </span>
                  <RateBar value={Math.round((count / weeks) * 100)} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stamp">
                <Check className="size-3.5" strokeWidth={3} />
                출석 ({attended.length})
              </h3>
              {attended.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {attended.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full border-[1.5px] border-stamp bg-stamp/10 px-3 py-1 text-sm font-medium text-ink"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/40">출석자가 없습니다.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink/45">
                <X className="size-3.5" strokeWidth={3} />
                결석 ({absent.length})
              </h3>
              {absent.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {absent.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full border-[1.5px] border-ink/15 bg-paper-deep px-3 py-1 text-sm font-medium text-ink/50"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/40">결석자가 없습니다.</p>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
