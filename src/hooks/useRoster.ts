// 세션별 학생/교사 명단 React Query 훅 — 30초 polling

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRoster } from "@/api/roster";
import type { Session } from "@/types";

// enabled=false면 API를 **새로 호출하지 않음**.
//
// ⚠️ 이것만으로는 비인증 화면을 보호하지 못한다. enabled:false는 요청만 막을 뿐
// **이미 캐시에 있는 데이터를 읽는 것은 막지 않는다.** queryKey(["roster", session])가
// 화면끼리 공유되므로, 메인(/)에서 한 번 받아두면 /registry·/teachers로 이동했을 때
// enabled:false여도 data가 즉시 채워지고 isLoading이 false가 된다.
// → 인증 게이트가 있는 화면은 **렌더 자체를 isAuthenticated로 막아야 한다.**
//   (주소창으로 직접 들어오면 캐시가 비어 있어 이 문제가 드러나지 않는다 — 주의)
//
// keepPrevious=true면 세션 전환 시 이전 데이터를 유지(스켈레톤 깜빡임 방지) — 교적부에서 사용.
// 이때 전환 중에는 isPlaceholderData가 true가 되어 "새 세션 로딩 중"을 표시할 수 있다.
export function useRoster(
  session: Session,
  enabled: boolean = true,
  keepPrevious: boolean = false,
) {
  return useQuery({
    queryKey: ["roster", session],
    queryFn: () => getRoster(session),
    refetchInterval: 30_000,
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
