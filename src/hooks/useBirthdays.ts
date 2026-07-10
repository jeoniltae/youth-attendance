// 세션별 생일자 명단 React Query 훅 — 정적 성격 데이터라 polling 없이 조회

import { useQuery } from "@tanstack/react-query";
import { getBirthdayRoster } from "@/api/birthdays";
import type { Session } from "@/types";

// enabled=false면 API 자체를 호출하지 않음 — 비인증 상태에서 화면 뒤에 실데이터가
// 미리 로드되는 것을 막기 위한 게이트
export function useBirthdays(session: Session, enabled: boolean = true) {
  return useQuery({
    queryKey: ["birthdays", session],
    queryFn: () => getBirthdayRoster(session),
    enabled,
  });
}
