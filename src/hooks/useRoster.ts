// 세션별 학생/교사 명단 React Query 훅 — 30초 polling

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRoster } from "@/api/roster";
import type { Session } from "@/types";

// enabled=false면 API 자체를 호출하지 않음 — 비인증 상태에서 화면 뒤에 실데이터가
// 미리 로드되는 것을 막기 위한 게이트 (모달만 가리는 것보다 강한 보호)
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
