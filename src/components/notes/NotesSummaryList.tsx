"use client";
// 말씀노트 시상 목록 — 횟수순 카드 행과 12회 기준선. 인증 뒤에만 마운트되므로 데이터 훅도 그때 처음 돈다

import { useState } from "react";
import { Skeleton } from "@/components/common/Skeleton";
import { useNotesSummary } from "@/hooks/useNotesSummary";
import { getTodayInSeoul, toInputDateValue } from "@/lib/date";
import { periodOfDate, periodsOfYear } from "@/lib/notes-period";
import { formatPhoneDisplay } from "@/lib/phone";
import type { NotesSummaryStudent } from "@/api/notes";

const AWARD_COUNT = 12;
const SESSIONS = ["전체", "오전", "오후"] as const;
type SessionTab = (typeof SESSIONS)[number];

// 연락처 칸에 줄바꿈이 있으면 엑셀에 붙일 때 행이 갈라진다
function toCopyLine(s: NotesSummaryStudent): string {
  const phone = formatPhoneDisplay(s.phone).replace(/\s*\n\s*/g, ", ");
  return [s.session, s.grade, s.class, s.name, phone, s.count].join("\t");
}

function Score({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 border-paper/15 px-2 py-3.5 not-first:border-l">
      <span className="font-display text-sm tracking-[0.15em] opacity-70">{label}</span>
      <span className="font-display text-[26px] font-bold">
        {value}
        <span className="text-sm opacity-70">{unit}</span>
      </span>
    </div>
  );
}

function SummaryRow({
  student,
  rank,
  sundays,
  award,
}: {
  student: NotesSummaryStudent;
  rank: number;
  sundays: number;
  award: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] px-3.5 py-1.5 ${
        award ? "min-h-12 border-[1.5px] border-teal/50 bg-teal/7" : "min-h-11 border border-ink/12"
      }`}
    >
      <span className="w-6 text-sm tabular-nums">{rank}</span>
      <span className={`min-w-[72px] ${award ? "font-semibold" : "font-medium"}`}>
        {student.name}
      </span>
      <span className="w-[120px] text-sm">
        {student.session} {student.grade}학년 {student.class}반
      </span>
      <span className="flex-[1_1_130px] text-sm tabular-nums">
        {formatPhoneDisplay(student.phone)}
      </span>
      <span className="relative h-1.5 flex-[1_1_140px] rounded-full bg-ink/10">
        <span
          className={`block h-full rounded-full ${award ? "bg-teal" : "bg-ink/35"}`}
          style={{ width: `${Math.min(100, (student.count / sundays) * 100)}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-[3px] h-3 w-0.5 bg-ink"
          style={{ left: `${(AWARD_COUNT / sundays) * 100}%` }}
        />
      </span>
      <span
        className={`ml-auto w-[60px] text-right text-sm tabular-nums ${award ? "font-semibold" : ""}`}
      >
        {student.count} / {sundays}
      </span>
    </li>
  );
}

export function NotesSummaryList() {
  const [today] = useState(() => periodOfDate(toInputDateValue(getTodayInSeoul())));
  const [periodKey, setPeriodKey] = useState(today.key);
  const [session, setSession] = useState<SessionTab>("전체");
  const [copy, setCopy] = useState<{ key: string; ok: boolean } | null>(null);

  const { data, isLoading, isError } = useNotesSummary(periodKey);

  const rows = (data?.students ?? []).filter((s) => session === "전체" || s.session === session);
  const winners = rows.filter((s) => s.count >= AWARD_COUNT);
  const others = rows.filter((s) => s.count < AWARD_COUNT);

  // 기간·세션이 바뀌면 복사 결과 문구가 저절로 사라지도록 그때의 조건을 함께 기억한다
  const copyKey = `${periodKey}|${session}`;
  const copied = copy?.key === copyKey ? copy : null;

  async function copyWinners() {
    try {
      await navigator.clipboard.writeText(winners.map(toCopyLine).join("\n"));
      setCopy({ key: copyKey, ok: true });
    } catch {
      setCopy({ key: copyKey, ok: false });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="self-end">
        <span className="sr-only">기간</span>
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="min-h-10 rounded-full border-[1.5px] border-ink/25 bg-paper px-3 font-medium text-ink"
        >
          {periodsOfYear(Number(today.key.slice(0, 4))).map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-ink text-paper">
        <Score label="시상 대상" value={winners.length} unit="명" />
        <Score label="전체" value={rows.length} unit="명" />
        <Score label="일요일" value={data?.sundays ?? 0} unit="회" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SESSIONS.map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed={label === session}
            onClick={() => setSession(label)}
            className={`min-h-10 rounded-full border-[1.5px] px-4 text-sm ${
              label === session
                ? "border-ink bg-ink text-paper"
                : "border-ink/25 bg-paper text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={copyWinners}
          disabled={winners.length === 0}
          className="ml-auto min-h-10 rounded-full bg-teal px-4.5 font-semibold text-paper disabled:opacity-40"
        >
          {copied ? (copied.ok ? "복사했어요" : "복사하지 못했어요") : "시상 명단 복사"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-[10px]" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="py-12 text-center text-sm text-celebrate">
          데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <ol className="flex flex-col gap-1.5">
            {winners.map((student, i) => (
              <SummaryRow
                key={student.id}
                student={student}
                rank={i + 1}
                sundays={data.sundays}
                award
              />
            ))}
          </ol>
          <div className="font-display flex items-center gap-2.5 py-2 text-sm font-bold text-stamp">
            <span className="flex-1 border-t-[1.5px] border-dashed border-stamp" />
            시상 기준 {AWARD_COUNT}회
            <span className="flex-1 border-t-[1.5px] border-dashed border-stamp" />
          </div>
          <ol start={winners.length + 1} className="flex flex-col gap-1.5">
            {others.map((student, i) => (
              <SummaryRow
                key={student.id}
                student={student}
                rank={winners.length + i + 1}
                sundays={data.sundays}
                award={false}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
