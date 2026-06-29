// 세션별 생일자 명단 React Query 훅 — 정적 성격 데이터라 polling 없이 조회

import { useQuery } from "@tanstack/react-query";
import { getBirthdayRoster } from "@/api/birthdays";
import type { Session } from "@/types";

export function useBirthdays(session: Session) {
  return useQuery({
    queryKey: ["birthdays", session],
    queryFn: () => getBirthdayRoster(session),
  });
}
