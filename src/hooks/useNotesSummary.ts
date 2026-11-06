// 말씀노트 기간 집계 React Query 훅 — 시상 명단 조회용이라 polling 없음

import { useQuery } from "@tanstack/react-query";
import { getNotesSummary } from "@/api/notes";

// enabled=false면 API 자체를 호출하지 않음 — admin 게이트 통과 전 데이터 로드 방지
export function useNotesSummary(period: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["notes-summary", period],
    queryFn: () => getNotesSummary(period),
    enabled,
  });
}
