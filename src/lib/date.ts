// 한국 시간(Asia/Seoul) 기준 오늘 날짜 계산 및 포맷

export function getTodayInSeoul(): Date {
  const seoulString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
  return new Date(seoulString);
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateLabel(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}(${WEEKDAY_LABELS[date.getDay()]})`;
}

export function toInputDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseInputDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, days: number): string {
  const date = parseInputDate(value);
  date.setDate(date.getDate() + days);
  return toInputDateValue(date);
}

// 기준일(미포함 아님, 당일이 일요일이면 당일 포함)로부터 가장 가까운 과거(또는 당일) 일요일
export function mostRecentSunday(from: Date = getTodayInSeoul()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - d.getDay()); // getDay() 0=일요일
  return d;
}

// 최근 일요일(예배일) 목록 — 오늘 기준 가장 최근 일요일부터 과거로 weeks개, 최신이 앞
// 값은 'YYYY-MM-DD' 문자열. 미래는 포함되지 않는다.
export function recentSundays(weeks = 53, from: Date = getTodayInSeoul()): string[] {
  const base = mostRecentSunday(from);
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 7);
    return toInputDateValue(d);
  });
}

// 올해(오늘 연도) 지난 일요일 목록 — 최신이 맨 앞, 미래·작년 미포함
// 연초라 올해 일요일이 아직 없으면 빈 배열
export function sundaysThisYear(from: Date = getTodayInSeoul()): string[] {
  const year = from.getFullYear();
  return recentSundays(53, from).filter((d) => Number(d.slice(0, 4)) === year);
}
