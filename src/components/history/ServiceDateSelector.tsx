// 출석 현황 조회 구간 선택 — 기준일(=종료일) + 기간 길이.
//
// 기본값 '1주'에서는 기존 단일 날짜 컨트롤과 화면이 동일하다(캡션 없음). 기간을 늘렸을 때만
// 아래에 구간 캡션이 붙는다.
//
// 선택지는 올해 일요일 목록(sundayOptions) 밖으로 나가지 않는다 — 과거 연도는 별도
// 스프레드시트라 현재 시트에 데이터가 없기 때문(docs/yearly-sheet-operation.md).

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlertDialog } from "@/components/common/AlertDialog";
import { formatDateLabel, parseInputDate } from "@/lib/date";
import type { RangePreset } from "@/lib/attendance-range";

const PRESET_WEEKS = [1, 2, 4, 8, 13];

const PILL_CLASS =
  "appearance-none rounded-full border border-dashed border-ink/30 bg-paper py-1.5 pl-3.5 pr-7 font-display text-sm font-semibold text-ink hover:border-ink/50";

const ARROW_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/20 disabled:hover:text-ink/60";

function SelectCaret() {
  return (
    <ChevronRight className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-ink/40" />
  );
}

function DateSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={PILL_CLASS}
      >
        {options.map((d) => (
          <option key={d} value={d}>
            {formatDateLabel(parseInputDate(d))}
          </option>
        ))}
      </select>
      <SelectCaret />
    </div>
  );
}

interface ServiceDateSelectorProps {
  /** 올해 일요일 목록 — 최신이 앞 */
  sundayOptions: string[];
  /** 기준일 = 조회 구간의 종료일 */
  date: string;
  onDateChange: (date: string) => void;
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customFrom: string;
  onCustomFromChange: (date: string) => void;
  /** resolveRange 결과 — 캡션 표기용 */
  from: string;
  weeks: number;
  /** 기간 내 실제로 예배가 있던 주 수. 로딩 중이면 null */
  serviceWeeks: number | null;
}

export function ServiceDateSelector({
  sundayOptions,
  date,
  onDateChange,
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  from,
  weeks,
  serviceWeeks,
}: ServiceDateSelectorProps) {
  // 경고 내용. null이면 닫힌 상태
  const [alert, setAlert] = useState<{
    title: string;
    details: { label: string; value: string }[];
    description: string;
  } | null>(null);

  const isCustom = preset === "custom";
  const dateIndex = sundayOptions.indexOf(date);
  const isPrevDisabled = dateIndex === -1 || dateIndex >= sundayOptions.length - 1;
  const isNextDisabled = dateIndex <= 0;

  function goToPrevSunday() {
    if (isPrevDisabled) return;
    onDateChange(sundayOptions[dateIndex + 1]);
  }

  function goToNextSunday() {
    if (isNextDisabled) return;
    onDateChange(sundayOptions[dateIndex - 1]);
  }

  // 목록보다 긴 프리셋은 의미가 없으므로 숨긴다 (연초에 올해 일요일이 몇 개 없을 때)
  const availableWeeks = PRESET_WEEKS.filter((w) => w <= sundayOptions.length);
  const hasRangeOptions = sundayOptions.length > 1;

  // 직접 지정 유효성 — 시작일과 종료일이 뒤집히면 경고하고 선택을 되돌린다.
  // select는 props로 제어되므로, setter를 호출하지 않으면 이전 값으로 자동 복귀한다.
  // (같은 날짜는 1주 조회로 유효하므로 막지 않는다)
  function dateLabel(value: string) {
    return formatDateLabel(parseInputDate(value));
  }

  function handleCustomFromChange(next: string) {
    if (next > date) {
      setAlert({
        title: "시작일이 종료일보다 늦습니다",
        details: [
          { label: "선택한 시작일", value: dateLabel(next) },
          { label: "현재 종료일", value: dateLabel(date) },
        ],
        description: "시작일은 종료일과 같거나 이전 날짜여야 합니다.",
      });
      return;
    }
    onCustomFromChange(next);
  }

  function handleEndDateChange(next: string) {
    if (isCustom && next < from) {
      setAlert({
        title: "종료일이 시작일보다 이릅니다",
        details: [
          { label: "현재 시작일", value: dateLabel(from) },
          { label: "선택한 종료일", value: dateLabel(next) },
        ],
        description: "종료일은 시작일과 같거나 이후 날짜여야 합니다.",
      });
      return;
    }
    onDateChange(next);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {!isCustom && (
          <button
            type="button"
            onClick={goToPrevSunday}
            disabled={isPrevDisabled}
            aria-label="이전 주일"
            className={ARROW_CLASS}
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        {isCustom ? (
          // 시작~종료는 한 덩어리로 묶는다 — 모바일에서 '~'만 앞줄에 남는 것을 방지
          <div className="flex items-center gap-1.5">
            <DateSelect
              value={from}
              options={sundayOptions}
              onChange={handleCustomFromChange}
              label="조회 시작일 (일요일)"
            />
            <span className="text-sm text-ink/40">~</span>
            <DateSelect
              value={date}
              options={sundayOptions}
              onChange={handleEndDateChange}
              label="조회 종료일 (일요일)"
            />
          </div>
        ) : (
          <DateSelect
            value={date}
            options={sundayOptions}
            onChange={onDateChange}
            label="조회할 예배일 (일요일)"
          />
        )}

        {!isCustom && (
          <button
            type="button"
            onClick={goToNextSunday}
            disabled={isNextDisabled}
            aria-label="다음 주일"
            className={ARROW_CLASS}
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        {hasRangeOptions && (
          <div className="relative">
            <select
              value={String(preset)}
              onChange={(e) => {
                const v = e.target.value;
                onPresetChange(v === "year" || v === "custom" ? v : Number(v));
              }}
              aria-label="조회 기간"
              className={PILL_CLASS}
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w === 13 ? "13주(분기)" : `${w}주`}
                </option>
              ))}
              <option value="year">올해 전체</option>
              <option value="custom">직접 지정</option>
            </select>
            <SelectCaret />
          </div>
        )}
      </div>

      {/*
        '지금 여러 주를 묶어 보고 있다'는 상태 표시라 눈에 걸려야 한다.
        색으로 강조하고 싶어도 stamp(2.84:1)·teal(3.97:1) 같은 강조색은 paper-deep 위
        12px 텍스트로 쓰면 WCAG AA(4.5:1)에 못 미친다. 그래서 글자는 대비가 확실한 ink로 두고
        (11.6:1), 색은 배지 배경이 담당한다. 틴트는 휘도차가 작지만 색상이 달라 실제로는
        충분히 구분된다 — 같은 화면의 개근/무출석 칩이 같은 방식이다.
        break-keep: 좁은 화면에서 '평균 기준'이 단어 중간에서 잘리지 않게.
      */}
      {weeks > 1 && (
        <p className="flex flex-wrap items-center justify-center gap-x-1 break-keep rounded-lg border border-stamp/35 bg-stamp/15 px-2.5 py-1 text-center text-xs text-ink/75">
          <span className="font-display font-semibold tabular-nums text-ink">
            {from} ~ {date}
          </span>
          <span>
            · <span className="font-semibold text-ink">{weeks}주</span>
            {serviceWeeks !== null &&
              (serviceWeeks === 0 ? (
                <span className="font-semibold text-ink"> · 출석 기록 없음</span>
              ) : (
                <>
                  {" 중 "}
                  <span className="font-semibold text-ink">{serviceWeeks}주</span>
                  {" 예배 · 평균 기준"}
                </>
              ))}
          </span>
        </p>
      )}

      {alert && (
        <AlertDialog
          open
          onClose={() => setAlert(null)}
          title={alert.title}
          details={alert.details}
          description={alert.description}
        />
      )}
    </div>
  );
}
