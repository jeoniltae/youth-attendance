// 기간 출석 집계 — /api/attendance/range 응답(날짜→ID 목록)을 화면이 쓰는 형태로 환산
//
// 분모(주 수)는 '기간 내 모든 일요일'이 아니라 **이 세션 인원이 1명 이상 출석한 날짜 수**다.
// 수련회·명절처럼 예배가 없던 주를 그대로 세면 평균이 왜곡되기 때문. /api/stats와
// /api/stats/rates가 이미 같은 규칙을 쓴다.
//
// 명단(memberIds)은 '현재' roster다. 과거 기간을 봐도 분모는 오늘의 명단이며,
// 이는 /api/stats와 동일한 의도적 근사다 — 분자·분모 기준을 통일해 세션 이동·학년 변경·
// 탈퇴자 고아 기록이 통계를 깨뜨리지 않게 한다.

/** 기간 길이 선택값 — 숫자는 주 수, 'year'는 올해 전체, 'custom'은 시작·종료일 직접 지정 */
export type RangePreset = number | 'year' | 'custom';

export interface ResolvedRange {
  from: string;
  to: string;
  /** 선택 구간에 들어가는 일요일 개수(달력 기준). 1이면 기존 단일 날짜 모드 */
  weeks: number;
}

// 기준일(=종료일) + 기간 길이 → 실제 조회 구간.
//
// 출석부는 1년 단위로 시트를 새로 만들어 운영하고 과거 연도는 별도 스프레드시트에 있으므로
// (docs/yearly-sheet-operation.md), 현재 시트에는 작년 데이터가 아예 없다. 따라서 구간은
// 올해 일요일 목록(sundayOptions) 밖으로 절대 나가지 않게 인덱스로만 계산하고 끝에서 clamp한다.
// 날짜 산술로 거슬러 올라가면 "선택은 되는데 결과가 항상 0건"인 구간이 생긴다.
export function resolveRange(
  sundayOptions: string[],
  date: string,
  preset: RangePreset,
  customFrom: string,
): ResolvedRange {
  if (sundayOptions.length === 0) return { from: date, to: date, weeks: 1 };

  const toIndex = Math.max(0, sundayOptions.indexOf(date));

  if (preset === 'custom') {
    // 화면(ServiceDateSelector)이 뒤집힌 선택을 경고로 막으므로 여기 도달할 일은 없지만,
    // 이 함수는 순수 함수라 어떤 입력이든 받을 수 있다. 스왑해 정규화해서 API가 400을
    // 받는 상태(from > to)로는 절대 나가지 않게 하는 최후 방어선.
    const a = customFrom || date;
    const [from, to] = a <= date ? [a, date] : [date, a];
    const fromIndex = Math.max(0, sundayOptions.indexOf(from));
    const endIndex = Math.max(0, sundayOptions.indexOf(to));
    // 목록은 최신이 앞이라 과거일수록 인덱스가 크다
    return { from, to, weeks: Math.max(1, fromIndex - endIndex + 1) };
  }

  const span = preset === 'year' ? sundayOptions.length : preset;
  const fromIndex = Math.min(toIndex + span - 1, sundayOptions.length - 1);

  return {
    from: sundayOptions[fromIndex],
    to: sundayOptions[toIndex],
    weeks: fromIndex - toIndex + 1,
  };
}

export interface RangeStats {
  /** id → 기간 내 출석한 날짜 수 (기록 없는 인원은 키 없음) */
  attendCounts: Map<string, number>;
  /** 이 세션 인원이 1명 이상 출석한 날짜, 오름차순 */
  serviceDates: string[];
  /** 주차별 추이 차트용 — serviceDates와 같은 순서 */
  weeklyTotals: { date: string; attended: number }[];
}

export function buildRangeStats(
  dates: Record<string, string[]>,
  memberIds: Set<string>,
): RangeStats {
  const attendCounts = new Map<string, number>();
  const weeklyTotals: { date: string; attended: number }[] = [];

  for (const date of Object.keys(dates).sort()) {
    // 명단에 없는 id(탈퇴자·다른 세션·레거시 고아 기록)는 분자에서 제외
    const ids = dates[date].filter((id) => memberIds.has(id));
    if (ids.length === 0) continue; // 이 세션 기준으로는 예배가 없던 날

    weeklyTotals.push({ date, attended: ids.length });
    for (const id of ids) {
      attendCounts.set(id, (attendCounts.get(id) ?? 0) + 1);
    }
  }

  return {
    attendCounts,
    serviceDates: weeklyTotals.map((w) => w.date),
    weeklyTotals,
  };
}
