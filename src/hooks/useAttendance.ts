// 날짜+세션 기준 출석 데이터 React Query 훅 — 30초 polling + 토글 Optimistic Update
//
// 연속 클릭 시 경합 방지 3중 장치:
// 1) 토글 요청 직렬화 — 같은 사람을 빠르게 체크→해제하면 서버 토글(행 유무 판정)이
//    동시에 실행되어 중복 행이 생길 수 있으므로, 요청을 큐로 순차 전송
// 2) onSettled의 refetch는 "마지막 토글"이 끝났을 때만 — 앞선 토글이 끝날 때마다
//    전체를 다시 읽으면 아직 반영 중인 중간 상태가 낙관적 UI를 덮어씀
// 3) 토글 진행 중에는 30초 폴링 일시 중지 — 폴링 응답이 중간 상태를 덮어쓰는 것 방지

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendance, toggleAttendance } from "@/api/attendance";
import type { AttendanceResponse, ToggleAttendancePayload } from "@/api/attendance";
import type { Session } from "@/types";

const TOGGLE_MUTATION_KEY = ["attendance-toggle"] as const;

function attendanceQueryKey(date: string, session: Session) {
  return ["attendance", date, session] as const;
}

// 토글 요청 직렬화 큐 — 실패해도 다음 요청은 계속 진행
let toggleQueue: Promise<unknown> = Promise.resolve();

function enqueueToggle<T>(fn: () => Promise<T>): Promise<T> {
  const run = toggleQueue.then(fn, fn);
  toggleQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function useAttendance(date: string, session: Session) {
  const queryClient = useQueryClient();
  const queryKey = attendanceQueryKey(date, session);

  const query = useQuery({
    queryKey,
    queryFn: () => getAttendance(date, session),
    refetchInterval: () =>
      queryClient.isMutating({ mutationKey: TOGGLE_MUTATION_KEY }) > 0 ? false : 30_000,
  });

  const toggleMutation = useMutation({
    mutationKey: TOGGLE_MUTATION_KEY,
    mutationFn: (payload: ToggleAttendancePayload) =>
      enqueueToggle(() => toggleAttendance(payload)),
    onMutate: async (payload: ToggleAttendancePayload) => {
      await queryClient.cancelQueries({ queryKey });

      queryClient.setQueryData<AttendanceResponse>(queryKey, (current) => {
        const ids = current?.studentIds ?? [];
        const isAttended = ids.includes(payload.studentId);
        return {
          studentIds: isAttended
            ? ids.filter((id) => id !== payload.studentId)
            : [...ids, payload.studentId],
        };
      });
    },
    onError: (_err, payload) => {
      // 스냅샷 복원 대신 해당 인원만 되돌림 — 동시에 진행 중인 다른 토글의
      // 낙관적 상태를 함께 지워버리지 않기 위함
      queryClient.setQueryData<AttendanceResponse>(queryKey, (current) => {
        const ids = current?.studentIds ?? [];
        const isAttended = ids.includes(payload.studentId);
        return {
          studentIds: isAttended
            ? ids.filter((id) => id !== payload.studentId)
            : [...ids, payload.studentId],
        };
      });
    },
    onSettled: () => {
      // 진행 중인 토글이 자신뿐일 때(=마지막)만 서버 상태와 동기화
      if (queryClient.isMutating({ mutationKey: TOGGLE_MUTATION_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  return {
    attendedIds: new Set(query.data?.studentIds ?? []),
    isLoading: query.isLoading,
    isError: query.isError,
    toggle: toggleMutation.mutate,
  };
}
