// 세션별 학생/교사 명단 React Query 훅 — 30초 polling

import { useQuery } from "@tanstack/react-query";
import { getRoster } from "@/api/roster";
import type { Session } from "@/types";

export function useRoster(session: Session) {
  return useQuery({
    queryKey: ["roster", session],
    queryFn: () => getRoster(session),
    refetchInterval: 30_000,
  });
}
