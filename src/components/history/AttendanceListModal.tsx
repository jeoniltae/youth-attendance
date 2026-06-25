// 반/팀 단위 출석자·결석자 명단을 보여주는 모달

import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MemberItem } from '@/lib/group-members';

interface AttendanceListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  members: MemberItem[];
  attendedIds: Set<string>;
}

export function AttendanceListModal({
  open,
  onOpenChange,
  title,
  members,
  attendedIds,
}: AttendanceListModalProps) {
  const attended = members.filter((m) => attendedIds.has(m.id));
  const absent = members.filter((m) => !attendedIds.has(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl border-[1.5px] border-ink/15 bg-paper p-5 ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            {title}
            <span className="ml-2 text-sm font-medium text-ink/40">
              출석 {attended.length} / {members.length}
            </span>
          </DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
