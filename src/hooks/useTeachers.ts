import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  type TeacherPayload,
} from "@/api/teachers";
import type { Session, Teacher } from "@/types";

export function useTeachers(session: Session) {
  const queryClient = useQueryClient();
  const queryKey = ["teachers", session] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getTeachers(session),
  });

  // 명단 + 개인 출석 통계 캐시를 함께 무효화 — 삭제/재등록 시 ID가 재사용되면
  // 옛 통계(예: 삭제 전 출석 1회)가 캐시에 남아 새 인원에 잘못 표시되는 것을 방지
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["member-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: (body: TeacherPayload) => createTeacher(body),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Teacher) => updateTeacher(id, body),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: invalidateAll,
  });

  return {
    teachers: query.data?.teachers ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isPending:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
