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
  const rank = (list: MemberItem[]) =>
    [...list].sort((a, b) => {
      const diff = (attendCounts.get(b.id) ?? 0) - (attendCounts.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
    });

  // 학생과 교사가 섞여 들어온 경우(개근·결석 명단)에만 학생 → 선생님 순으로 나눈다.
  // 반/팀 모달은 한 종류뿐이라 type이 비어 있고, 그대로 한 덩어리로 나온다.
  const students = members.filter((m) => m.type === 'student');
  const teachers = members.filter((m) => m.type === 'teacher');
  // 색은 화면 다른 곳과 같은 의미색을 쓴다 — 학년(학생)=ink, 선생님=teal
  // (GroupAttendanceChart의 HEADER_COLOR와 동일).
  // 배경을 bg-ink/12 같은 반투명으로 주면 sticky 머리글 아래로 스크롤되는 행이 비쳐 보이므로,
  // color-mix로 같은 톤의 '불투명' 색을 만들어 쓴다.
  const sections =
    students.length > 0 && teachers.length > 0
      ? [
          {
            key: 'student',
            label: '학생',
            band: 'bg-[color-mix(in_oklab,var(--ink)_12%,var(--paper))]',
            dot: 'bg-ink',
            list: rank(students),
          },
          {
            key: 'teacher',
            label: '선생님',
            band: 'bg-[color-mix(in_oklab,var(--teal)_20%,var(--paper))]',
            dot: 'bg-teal',
            list: rank(teachers),
          },
        ]
      : [{ key: 'all', label: null, band: '', dot: '', list: rank(members) }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        제목을 고정하고 명단만 스크롤한다 — 인원이 많으면 스크롤 도중 "어느 반/무슨 기준
        명단인지"를 잃어버리기 때문. 스크롤 컨테이너를 DialogContent에서 본문 div로 옮기고
        (prop 기본값이 grid라 flex로 덮어씀), 헤더는 shrink-0으로 눌리지 않게 고정한다.
        pr-12: 우상단 닫기(X) 버튼과 제목이 겹치지 않도록 확보.
      */}
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-paper p-0 ring-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-ink/10 px-5 py-4 pr-12">
          <DialogTitle className="font-display text-lg font-bold text-ink">
            {title}
            <span className="ml-2 text-sm font-medium text-ink/45">
              {isRange
                ? `${weeks}주 · ${members.length}명`
                : `출석 ${attended.length} / ${members.length}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/*
          min-h-0 없으면 flex 자식이 내용 높이만큼 커져 max-h가 무시된다.
          위쪽 패딩은 주지 않는다 — sticky 머리글은 padding 안쪽(content box)에 붙으므로
          pt가 있으면 그 틈으로 스크롤되는 행이 머리글 위에 비쳐 보인다. 상단 여백은
          머리글이 없는 갈래에서만 각자 pt-4로 준다.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {isRange ? (
          sections.map((sec) => (
            <div key={sec.key} className={sec.label ? undefined : 'pt-4'}>
              {/* 구분 머리글은 스크롤에 붙여둔다 — 긴 명단에서 지금 어느 쪽을 보는지 잃지 않게.
                  -mx-5 px-5: 본문 좌우 패딩만큼 넓혀 배경이 끝까지 덮이도록 */}
              {sec.label && (
                <h3
                  className={`sticky top-0 z-10 -mx-5 flex items-center gap-2 border-y border-ink/10 px-5 py-2 font-display text-sm font-bold tracking-[0.06em] text-ink ${sec.band}`}
                >
                  <span className={`size-2 shrink-0 rounded-full ${sec.dot}`} />
                  {sec.label}
                  <span className="font-medium text-ink/60">{sec.list.length}명</span>
                </h3>
              )}
              <ul className="flex flex-col divide-y divide-ink/8">
                {sec.list.map((m) => {
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
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-4 pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
