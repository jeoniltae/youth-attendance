// 음력 월/일을 특정 연도의 양력 월/일로 변환하는 유틸 (한국천문연구원 기준, korean-lunar-calendar 사용)

import KoreanLunarCalendar from "korean-lunar-calendar";

/**
 * 지정한 연도의 음력 month/day를 그 연도의 양력 month/day로 변환한다.
 * 음력 생일은 매년 양력 날짜가 달라지므로, 호출 시점의 연도를 넘겨 "올해는 몇 월 며칠인지"를 계산한다.
 * 윤달 여부는 입력받지 않고 항상 평달(윤달 아님)로 간주한다 — 지원 범위(1000~2050) 밖이거나
 * 존재하지 않는 날짜(예: 그 해에 없는 윤달의 날짜)면 null을 반환하며, 호출부는 원래 월/일로 폴백한다.
 */
export function lunarToSolar(
  year: number,
  lunarMonth: number,
  lunarDay: number,
): { month: number; day: number } | null {
  const calendar = new KoreanLunarCalendar();
  const ok = calendar.setLunarDate(year, lunarMonth, lunarDay, false);
  if (!ok) return null;
  const solar = calendar.getSolarCalendar();
  return { month: solar.month, day: solar.day };
}
