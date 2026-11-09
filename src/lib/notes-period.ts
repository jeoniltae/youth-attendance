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

// 새 기수가 시작된 뒤 지난 기수 날짜도 체크할 수 있는 기간 — 몰아서 체크하는 교사를 위해
export const NOTES_GRACE_DAYS = 21;

// 말씀노트를 체크할 수 있는 일요일 — 지금 기수의 지난 일요일, 새 기수 시작 후 NOTES_GRACE_DAYS일 동안은
// 같은 해의 지난 기수 일요일까지. 화면의 날짜 칩과 서버 검증이 같은 기준을 쓴다.
// sundays는 sundaysThisYear() 결과(올해·미래 제외·최신이 앞), today는 한국 시간 'YYYY-MM-DD'.
// 다른 파일을 import하지 않는 순수 함수로 둔다 — 검사 스크립트가 Node로 이 파일을 바로 불러온다
export function checkableSundays(sundays: string[], today: string): string[] {
  const current = periodOfDate(today);
  const index = Number(current.key.slice(-1)) - 1;
  const graceEnd = new Date(`${current.from}T00:00:00Z`);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + NOTES_GRACE_DAYS - 1);
  const inGrace = today <= graceEnd.toISOString().slice(0, 10);
  const earliest = inGrace && index > 0 ? toPeriod(Number(today.slice(0, 4)), index - 1).from : current.from;
  return sundays.filter((d) => d >= earliest);
}
