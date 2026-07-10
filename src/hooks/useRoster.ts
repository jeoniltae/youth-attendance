// 세션별 학생/교사 명단 React Query 훅 — 30초 polling

import { useQuery } from "@tanstack/react-query";
import { getRoster } from "@/api/roster";
import type { Session } from "@/types";

// enabled=false면 API 자체를 호출하지 않음 — 비인증 상태에서 화면 뒤에 실데이터가
// 미리 로드되는 것을 막기 위한 게이트 (모달만 가리는 것보다 강한 보호)
export function useRoster(session: Session, enabled: boolean = true) {
  return useQuery({
    queryKey: ["roster", session],
    queryFn: () => getRoster(session),
    refetchInterval: 30_000,
    enabled,
  });
}
