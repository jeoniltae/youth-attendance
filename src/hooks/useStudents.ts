import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  type StudentPayload,
} from "@/api/students";
import type { Session, Student } from "@/types";

// enabled=false면 API 자체를 호출하지 않음 — 비인증 상태에서 화면 뒤에 실데이터가
// 미리 로드되는 것을 막기 위한 게이트
export function useStudents(session: Session, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const queryKey = ["students", session] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getStudents(session),
    enabled,
  });

  // 명단 + 개인 출석 통계 캐시를 함께 무효화 — 삭제/재등록 시 ID가 재사용되면
  // 옛 통계(예: 삭제 전 출석 1회)가 캐시에 남아 새 인원에 잘못 표시되는 것을 방지
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["member-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: (body: StudentPayload) => createStudent(body),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Student) => updateStudent(id, body),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: invalidateAll,
  });

  return {
    students: query.data?.students ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isPending:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
