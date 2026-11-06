// 말씀노트 시상 기간 — 연도 안에서 끝나는 4개월 단위. 키는 "2026-3"(2026년 3기, 9~12월)

const PERIODS = [
  { months: '1~4월', from: '01-01', to: '04-30' },
  { months: '5~8월', from: '05-01', to: '08-31' },
  { months: '9~12월', from: '09-01', to: '12-31' },
];

export interface NotesPeriod {
  key: string;
  label: string; // "2026년 3기 (9~12월)"
  from: string;
  to: string;
}

function toPeriod(year: number, index: number): NotesPeriod {
  const { months, from, to } = PERIODS[index];
  return {
    key: `${year}-${index + 1}`,
    label: `${year}년 ${index + 1}기 (${months})`,
    from: `${year}-${from}`,
    to: `${year}-${to}`,
  };
}

export function periodsOfYear(year: number): NotesPeriod[] {
  return PERIODS.map((_, i) => toPeriod(year, i));
}

// 'YYYY-MM-DD'가 속한 기간
export function periodOfDate(date: string): NotesPeriod {
  const month = Number(date.slice(5, 7));
  return toPeriod(Number(date.slice(0, 4)), Math.floor((month - 1) / 4));
}

// 키가 잘못됐으면 null — 쿼리 파라미터 검증용
export function periodFromKey(key: string): NotesPeriod | null {
  const match = /^(\d{4})-([123])$/.exec(key);
  return match ? toPeriod(Number(match[1]), Number(match[2]) - 1) : null;
}
