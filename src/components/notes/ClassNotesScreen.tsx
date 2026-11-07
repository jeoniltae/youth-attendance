"use client";
// 말씀노트 체크 화면 본체 — 상단 고정 영역(반·진행 막대·날짜 칩)과 세로 명단

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/common/Skeleton";
import { NoteCheckCard } from "@/components/notes/NoteCheckCard";
import { useClassNotes } from "@/hooks/useClassNotes";
import { formatDateLabelShort, parseInputDate, sundaysThisYear } from "@/lib/date";
import type { ClassNotesResponse } from "@/api/notes";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-ink/70">{children}</p>
    </main>
  );
}

export function ClassNotesScreen({ token }: { token: string }) {
  const [sundays, setSundays] = useState(() => sundaysThisYear());
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? sundays[0] ?? "";
  const { data, students, isLoading, isPlaceholderData, isError, toggle } = useClassNotes(
    token,
    date,
  );

  // 며칠 열어 둔 탭으로 돌아오면 새 일요일을 기본으로 — 지난주에 고정되면 이번 주 체크가 지난주로 저장된다
  useEffect(() => {
    function refreshSundays() {
      if (document.visibilityState !== "visible") return;
      const next = sundaysThisYear();
      if (next[0] !== sundays[0]) {
        setSundays(next);
        setPicked(null);
      }
    }
    document.addEventListener("visibilitychange", refreshSundays);
    return () => document.removeEventListener("visibilitychange", refreshSundays);
  }, [sundays]);

  // 다른 날짜 조회가 실패해도 반 제목과 날짜 칩은 남긴다 (렌더 중 파생 상태 갱신 — 효과 불필요)
  const [lastClass, setLastClass] = useState<ClassNotesResponse | null>(null);
  if (data && data !== lastClass) setLastClass(data);
  const klass = data ?? lastClass;

  if (date === "") {
    return <Notice title="아직 체크할 날짜가 없어요">올해 첫 일요일부터 체크할 수 있습니다.</Notice>;
  }
  if (data === null) {
    return <Notice title="잘못된 주소예요">보관함에 붙은 QR을 다시 찍어주세요.</Notice>;
  }
  if (isError && !klass) {
    return (
      <Notice title="명단을 불러오지 못했어요">잠시 뒤 새로고침해서 다시 시도해주세요.</Notice>
    );
  }

  const list = isPlaceholderData ? undefined : students;
  const total = list?.length ?? 0;
  const done = list?.filter((s) => s.written).length ?? 0;
  const failedNames = list?.filter((s) => s.saveFailed).map((s) => s.name) ?? [];

  return (
    <main className="mx-auto w-full max-w-[560px]">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b-[1.5px] border-ink/15 bg-paper-deep px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          {klass ? (
            <h1 className="font-display text-[22px] font-bold text-ink">
              {klass.session} · {klass.grade}학년 {klass.class}반
            </h1>
          ) : (
            <Skeleton className="h-8 w-36" />
          )}
          {list && (
            <p className="font-display whitespace-nowrap font-bold text-ink">
              {total}명 중 <span className="text-stamp">{done}명</span> 체크
            </p>
          )}
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ink/12">
          <div
            className="h-full rounded-full bg-stamp transition-[width]"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {sundays.map((sunday) => (
            <button
              key={sunday}
              type="button"
              aria-pressed={sunday === date}
              onClick={() => setPicked(sunday)}
              className={`min-h-11 flex-none rounded-full border-[1.5px] px-3.5 text-sm font-medium tabular-nums ${
                sunday === date
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 bg-paper text-ink"
              }`}
            >
              {formatDateLabelShort(parseInputDate(sunday))}
            </button>
          ))}
        </div>
        {failedNames.length > 0 && (
          <p role="alert" className="rounded-lg bg-stamp/10 px-3 py-2 text-sm font-medium text-ink">
            {failedNames.join(", ")} 저장하지 못했어요. 다시 눌러주세요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3 pb-6">
        {isError && !list ? (
          <p className="py-12 text-center text-sm text-celebrate">
            명단을 불러오지 못했습니다. 잠시 뒤 자동으로 다시 불러옵니다.
          </p>
        ) : isLoading || !list ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 rounded-[10px]" />)
        ) : (
          list.map((student) => (
            <NoteCheckCard
              key={student.id}
              name={student.name}
              written={student.written}
              present={student.present}
              onToggle={() => toggle(student.id)}
            />
          ))
        )}
      </div>
    </main>
  );
}
