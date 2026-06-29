// 날짜+세션 기준 출석 데이터 React Query 훅 — 30초 polling + 토글 Optimistic Update

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendance, toggleAttendance } from "@/api/attendance";
import type { AttendanceResponse, ToggleAttendancePayload } from "@/api/attendance";
import type { Session } from "@/types";

function attendanceQueryKey(date: string, session: Session) {
  return ["attendance", date, session] as const;
}

export function useAttendance(date: string, session: Session) {
  const queryClient = useQueryClient();
  const queryKey = attendanceQueryKey(date, session);

  const query = useQuery({
    queryKey,
    queryFn: () => getAttendance(date, session),
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleAttendance,
    onMutate: async (payload: ToggleAttendancePayload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AttendanceResponse>(queryKey);

      queryClient.setQueryData<AttendanceResponse>(queryKey, (current) => {
        const ids = current?.studentIds ?? [];
        const isAttended = ids.includes(payload.studentId);
        return {
          studentIds: isAttended
            ? ids.filter((id) => id !== payload.studentId)
            : [...ids, payload.studentId],
        };
      });

      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    attendedIds: new Set(query.data?.studentIds ?? []),
    isLoading: query.isLoading,
    isError: query.isError,
    toggle: toggleMutation.mutate,
  };
}
