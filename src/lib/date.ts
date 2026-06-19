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
