// 기간(여러 주) 출석 데이터 React Query 훅 — 읽기 전용
//
// 출석체크 메인(/)이 쓰는 useAttendance와 분리한 이유: 그쪽은 연타 경합 대책(직렬화 큐 +
// 펜딩 델타 오버레이)이 들어간 토글 전용 훅이고, 기간 조회는 토글이 없다.
//
// 폴링은 '진행 중인 주'를 보고 있을 때만 의미가 있다. 지나간 구간의 출석은 더 이상
// 바뀌지 않으므로 수천 행짜리 시트를 30초마다 다시 읽지 않는다.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAttendanceRange } from "@/api/attendance";

export function useAttendanceRange(
  from: string,
  to: string,
  enabled: boolean = true,
  /** 종료일이 가장 최근 예배일이면 true — 이때만 30초 폴링 */
  live: boolean = false,
) {
  return useQuery({
    queryKey: ["attendance-range", from, to],
    queryFn: () => getAttendanceRange(from, to),
    refetchInterval: live ? 30_000 : false,
    staleTime: live ? 0 : 5 * 60_000,
    enabled: enabled && !!from && !!to,
    // 기간을 넓힐 때 스켈레톤으로 깜빡이지 않도록 이전 구간 데이터를 잠시 유지
    placeholderData: keepPreviousData,
  });
}
