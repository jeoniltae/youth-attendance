// 반별 말씀노트 체크 React Query 훅 — 30초 polling + 낙관적 UI.
// 연타·polling 경합 대책은 useAttendance와 같다(요청 직렬화, 펜딩 델타 오버레이, 목표 상태 전송).
// 날짜를 바꿔도 처리 중인 체크가 섞이지 않도록 델타 키에 날짜를 넣는다.

import { useMemo, useReducer, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClassNotes, saveClassNote } from "@/api/notes";
import type { SaveClassNotePayload } from "@/api/notes";

const SAVE_MUTATION_KEY = ["notes-save"] as const;

let saveQueue: Promise<unknown> = Promise.resolve();

function enqueueSave<T>(fn: () => Promise<T>): Promise<T> {
  const run = saveQueue.then(fn, fn);
  saveQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function deltaKey(date: string, studentId: string) {
  return `${date}|${studentId}`;
}

// date가 빈 문자열이면 조회하지 않는다 — 새해 첫 일요일 전처럼 고를 날짜가 없을 때
export function useClassNotes(token: string, date: string) {
  const queryClient = useQueryClient();

  const deltasRef = useRef(new Map<string, boolean>());
  const genRef = useRef(0);
  const [version, bump] = useReducer((x: number) => x + 1, 0);

  const query = useQuery({
    queryKey: ["notes-class", token, date],
    queryFn: () => getClassNotes(token, date),
    refetchInterval: () =>
      queryClient.isMutating({ mutationKey: SAVE_MUTATION_KEY }) > 0 ? false : 30_000,
    enabled: date !== "",
    placeholderData: keepPreviousData, // 날짜를 바꾸는 동안 반 제목 유지 — 명단은 화면이 isPlaceholderData로 가린다
  });

  const mutation = useMutation({
    mutationKey: SAVE_MUTATION_KEY,
    mutationFn: (payload: SaveClassNotePayload) => enqueueSave(() => saveClassNote(payload)),
    onMutate: async (payload) => {
      genRef.current++;
      deltasRef.current.set(deltaKey(payload.date, payload.studentId), payload.status === "작성");
      bump();
      await queryClient.cancelQueries({ queryKey: ["notes-class", token, payload.date] });
    },
    onError: (_err, payload) => {
      // 더 나중 클릭이 델타를 덮어쓴 뒤 이전 요청이 실패한 경우는 되돌리지 않는다
      const key = deltaKey(payload.date, payload.studentId);
      if (deltasRef.current.get(key) === (payload.status === "작성")) {
        deltasRef.current.delete(key);
        bump();
      }
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: SAVE_MUTATION_KEY }) === 1) {
        const gen = genRef.current;
        await queryClient.invalidateQueries({ queryKey: ["notes-class", token] });
        if (genRef.current === gen) {
          deltasRef.current.clear();
          bump();
        }
      }
    },
  });

  const students = useMemo(
    () =>
      query.data?.students.map((s) => ({
        ...s,
        written: deltasRef.current.get(deltaKey(date, s.id)) ?? s.written,
      })),
    // version: deltasRef 변경(bump) 시 재계산 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, date, version],
  );

  function toggle(studentId: string) {
    const current = students?.find((s) => s.id === studentId)?.written ?? false;
    mutation.mutate({ token, date, studentId, status: current ? "미작성" : "작성" });
  }

  return {
    data: query.data,
    students,
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    toggle,
  };
}
