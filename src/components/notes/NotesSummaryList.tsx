"use client";
// 말씀노트 시상 목록 — 횟수순 카드 행과 12회 기준선. 인증 뒤에만 마운트되므로 데이터 훅도 그때 처음 돈다

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { RollingNumber } from "@/components/common/RollingNumber";
import { Skeleton } from "@/components/common/Skeleton";
import { useNotesSummary } from "@/hooks/useNotesSummary";
import { getTodayInSeoul, toInputDateValue } from "@/lib/date";
import { periodOfDate, periodsOfYear } from "@/lib/notes-period";
import { formatPhoneDisplay, splitPhones } from "@/lib/phone";
import type { NotesSummaryStudent } from "@/api/notes";

const AWARD_COUNT = 12;
// 기준선 아래는 이만큼씩 그린다 — 화면의 목적은 기준선 위(시상 대상) 확인·복사라 아래는 필요할 때만 펼친다
const PAGE_SIZE = 20;
const COPIED_MS = 2000;
const SESSIONS = ["전체", "오전", "오후"] as const;
type SessionTab = (typeof SESSIONS)[number];

// 연락처 칸에 줄바꿈이 있으면 엑셀에 붙일 때 행이 갈라진다
function toCopyLine(s: NotesSummaryStudent): string {
  const phone = formatPhoneDisplay(s.phone).replace(/\s*\n\s*/g, ", ");
  return [s.session, s.grade, s.class, s.name, phone, s.count].join("\t");
}

// 메인 점수판(SummaryBar)과 같은 방식 — 숫자는 굴러가고, 단위는 suffix가 아니라 옆 span(숫자 크기로 그려져 좁은 칸에서 넘친다)
function Score({ label, value, unit, loading }: { label: string; value: number; unit: string; loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 border-paper/15 px-2 py-3.5 not-first:border-l">
      <span className="font-display text-sm tracking-[0.15em] opacity-70">{label}</span>
      {loading ? (
        <Skeleton className="my-1.5 h-7 w-12 bg-paper/20" />
      ) : (
        <span className="flex items-baseline gap-0.5">
          <RollingNumber value={value} className="font-display text-[26px] font-bold tabular-nums" />
          <span className="font-display text-sm font-semibold opacity-70">{unit}</span>
        </span>
      )}
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
  // 모바일은 두 줄 격자(1줄 순번·이름·반·횟수 / 2줄 연락처·막대), sm 이상은 한 줄 flex.
  // 묶음 div는 sm에서 `contents`라 안의 칸이 바깥 flex의 칸이 된다
  return (
    <li
      className={`grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[10px] px-3.5 py-2 sm:flex sm:flex-wrap sm:gap-y-1 sm:py-1.5 ${
        award ? "min-h-12 border-[1.5px] border-teal/50 bg-teal/7" : "min-h-11 border border-ink/12"
      }`}
    >
      <span className="text-sm tabular-nums sm:w-6">{rank}</span>
      <div className="flex min-w-0 items-baseline gap-2 sm:contents">
        <span className={`truncate sm:min-w-[72px] ${award ? "font-semibold" : "font-medium"}`}>
          {student.name}
        </span>
        <span className="whitespace-nowrap text-xs text-ink/70 sm:w-[120px] sm:text-sm sm:text-ink">
          {student.session} {student.grade}학년 {student.class}반
        </span>
      </div>
      <div className="col-span-2 col-start-2 row-start-2 flex items-center gap-3 sm:contents">
        {/* 번호 안의 하이픈에서 줄이 꺾이지 않게 번호마다 한 덩어리로 */}
        <span className="flex min-w-0 flex-1 flex-wrap gap-x-2 text-xs tabular-nums text-ink/70 sm:flex-[1_1_130px] sm:text-sm sm:text-ink">
          {splitPhones(student.phone).map((phone, i) => (
            <span key={i} className="whitespace-nowrap">
              {formatPhoneDisplay(phone)}
            </span>
          ))}
        </span>
        {/* 모바일은 막대 폭을 고정 — 연락처 길이에 따라 12회 표시선 위치가 행마다 달라지지 않게 */}
        <span className="relative ml-auto h-1.5 w-28 flex-none rounded-full bg-ink/10 sm:ml-0 sm:w-auto sm:flex-[1_1_140px]">
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
      </div>
      <span
        className={`col-start-3 row-start-1 whitespace-nowrap text-right text-sm tabular-nums sm:ml-auto sm:w-[60px] ${award ? "font-semibold" : ""}`}
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
  const [copied, setCopied] = useState<{ ok: boolean } | null>(null);
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  const { data, isLoading, isError } = useNotesSummary(periodKey);

  const rows = (data?.students ?? []).filter((s) => session === "전체" || s.session === session);
  const winners = rows.filter((s) => s.count >= AWARD_COUNT);
  const others = rows.filter((s) => s.count < AWARD_COUNT);
  const shownOthers = others.slice(0, shownCount);
  const hiddenCount = others.length - shownOthers.length;

  // 기간·세션을 바꾸면 복사 결과 문구와 더 보기 개수를 처음으로 — 다른 명단의 결과가 남지 않게
  function changeView(next: { period?: string; session?: SessionTab }) {
    if (next.period) setPeriodKey(next.period);
    if (next.session) setSession(next.session);
    setCopied(null);
    setShownCount(PAGE_SIZE);
  }

  // 성공 표시는 잠깐만 — 실패 문구는 다시 누를 때까지 남긴다
  useEffect(() => {
    if (!copied?.ok) return;
    const timer = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyWinners() {
    try {
      await navigator.clipboard.writeText(winners.map(toCopyLine).join("\n"));
      setCopied({ ok: true });
    } catch {
      setCopied({ ok: false });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="self-end">
        <span className="sr-only">기간</span>
        <select
          value={periodKey}
          onChange={(e) => changeView({ period: e.target.value })}
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
        <Score label="시상 대상" value={winners.length} unit="명" loading={isLoading} />
        <Score label="전체" value={rows.length} unit="명" loading={isLoading} />
        <Score label="일요일" value={data?.sundays ?? 0} unit="회" loading={isLoading} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SESSIONS.map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed={label === session}
            onClick={() => changeView({ session: label })}
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
          className="ml-auto inline-flex min-h-10 min-w-36 items-center justify-center gap-1.5 rounded-full bg-teal px-4.5 font-semibold text-paper disabled:opacity-40"
        >
          {copied?.ok && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
          {copied ? (copied.ok ? "복사했어요" : "복사하지 못했어요") : "시상 명단 복사"}
        </button>
        {/* 버튼 글자가 바뀐 것을 화면 읽기 프로그램에도 알린다 */}
        <span role="status" className="sr-only">
          {copied ? (copied.ok ? `시상 명단 ${winners.length}명을 복사했어요` : "복사하지 못했어요") : ""}
        </span>
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
        // 탭은 받은 데이터를 거르기만 해 즉시 바뀐다 — 스켈레톤 대신 목록이 살짝 올라오며 바뀐 것을 알린다
        <div
          key={`${periodKey}|${session}`}
          className="flex flex-col gap-1.5 animate-[rise-in_0.35s_ease-out_both] motion-reduce:animate-none"
        >
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
            {shownOthers.map((student, i) => (
              <SummaryRow
                key={student.id}
                student={student}
                rank={winners.length + i + 1}
                sundays={data.sundays}
                award={false}
              />
            ))}
          </ol>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShownCount((n) => n + PAGE_SIZE)}
              className="mt-1.5 min-h-11 rounded-[10px] border-[1.5px] border-dashed border-ink/25 text-sm font-medium text-ink hover:bg-ink/5"
            >
              {Math.min(PAGE_SIZE, hiddenCount)}명 더 보기 <span className="text-ink/60">(남은 {hiddenCount}명)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
