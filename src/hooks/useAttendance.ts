// 날짜+세션 기준 출석 데이터 React Query 훅 — 30초 polling + 펜딩 델타 오버레이 낙관적 UI
//
// 연속 클릭 경합 대책:
// 1) 토글 요청 직렬화 — 같은 사람을 빠르게 체크→해제하면 서버 쓰기(행 추가/삭제)가 동시에
//    실행되어 순서가 꼬일 수 있으므로, 요청을 큐로 순차 전송
// 2) 펜딩 델타 오버레이 — "내가 처리 중인 인원 → 목표 상태" Map을 서버 응답 위에 항상
//    덧씌워 화면을 계산한다. 어떤 시점의 (stale한) GET 응답이 도착해도 처리 중인 인원의
//    표시는 절대 뒤집히지 않는다. 델타는 큐가 다 빈 뒤 시작한 최종 refetch가 완료됐을 때만
//    지운다(그 응답에는 모든 쓰기가 반영돼 있으므로 안전).
//    ※ 이전 방식(캐시 직접 조작 + 타이밍 방어)은 30초 폴링 타이머가 연타 도중 발화해
//      해제한 인원이 몇 초간 다시 체크된 것처럼 보이는 간헐적 깜빡임이 있었다.
// 3) 목표 상태 명시 전송 — 클릭 시점에 사용자가 의도한 상태(출석/결석)를 status로 보내
//    서버가 멱등 처리한다. 다른 교사가 동시에 같은 사람을 조작해도 의도가 보존된다.
// 4) 토글 진행 중에는 30초 폴링 예약 일시 중지(불필요한 요청 감소)

import { useMemo, useReducer, useRef } from "react";
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

// enabled=false면 API 자체를 호출하지 않음 — 비인증 상태에서 화면 뒤에 실데이터가
// 미리 로드되는 것을 막기 위한 게이트
export function useAttendance(date: string, session: Session, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const queryKey = attendanceQueryKey(date, session);

  // 처리 중인 인원 → 목표 출석 상태. ref라 변경이 재렌더를 일으키지 않으므로 version으로 강제
  const deltasRef = useRef(new Map<string, boolean>());
  // 델타 세대 번호 — 최종 refetch 완료 시점에 새 클릭이 없었을 때만 델타를 지우기 위한 가드
  const genRef = useRef(0);
  const [version, bump] = useReducer((x: number) => x + 1, 0);

  const query = useQuery({
    queryKey,
    queryFn: () => getAttendance(date, session),
    refetchInterval: () =>
      queryClient.isMutating({ mutationKey: TOGGLE_MUTATION_KEY }) > 0 ? false : 30_000,
    enabled,
  });

  const toggleMutation = useMutation({
    mutationKey: TOGGLE_MUTATION_KEY,
    mutationFn: (payload: ToggleAttendancePayload) =>
      enqueueToggle(() => toggleAttendance(payload)),
    onMutate: async (payload) => {
      genRef.current++;
      deltasRef.current.set(payload.studentId, payload.status === "출석");
      bump();
      // 진행 중인 GET은 어차피 오버레이에 덮이지만, 취소해서 불필요한 갱신을 줄인다
      await queryClient.cancelQueries({ queryKey });
    },
    onError: (_err, payload) => {
      // 같은 인원의 더 나중 클릭이 델타를 덮어쓴 뒤 이전 요청이 실패할 수 있으므로,
      // 델타가 여전히 이 요청의 의도와 같을 때만 되돌린다
      if (deltasRef.current.get(payload.studentId) === (payload.status === "출석")) {
        deltasRef.current.delete(payload.studentId);
        bump();
      }
    },
    onSettled: async () => {
      // 진행 중인 토글이 자신뿐일 때(=마지막)만 서버 상태와 동기화.
      // 이 시점엔 큐가 비어 모든 쓰기가 반영됐으므로, 이 refetch 응답은 신뢰 가능
      if (queryClient.isMutating({ mutationKey: TOGGLE_MUTATION_KEY }) === 1) {
        const gen = genRef.current;
        await queryClient.refetchQueries({ queryKey });
        // refetch 동안 새 클릭이 있었다면(세대 변경) 델타를 유지 — 그 클릭의 마지막
        // settle이 다시 여기로 와서 정리한다
        if (genRef.current === gen) {
          deltasRef.current.clear();
          bump();
        }
      }
    },
  });

  const attendedIds = useMemo(() => {
    const ids = new Set(query.data?.studentIds ?? []);
    for (const [id, attended] of deltasRef.current) {
      if (attended) ids.add(id);
      else ids.delete(id);
    }
    return ids;
    // version: deltasRef 변경(bump) 시 재계산 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, version]);

  function toggle(payload: ToggleAttendancePayload) {
    // 현재 화면에 보이는(오버레이 적용된) 상태의 반대를 목표 상태로 명시해 전송
    const current = deltasRef.current.has(payload.studentId)
      ? deltasRef.current.get(payload.studentId)!
      : (queryClient.getQueryData<AttendanceResponse>(queryKey)?.studentIds ?? []).includes(
          payload.studentId,
        );
    toggleMutation.mutate({ ...payload, status: current ? "결석" : "출석" });
  }

  return {
    attendedIds,
    isLoading: query.isLoading,
    isError: query.isError,
    toggle,
  };
}
