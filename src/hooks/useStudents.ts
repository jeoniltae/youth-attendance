import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  type StudentPayload,
} from "@/api/students";
import type { Session, Student } from "@/types";

export function useStudents(session: Session) {
  const queryClient = useQueryClient();
  const queryKey = ["students", session] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getStudents(session),
  });

  const createMutation = useMutation({
    mutationFn: (body: StudentPayload) => createStudent(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Student) => updateStudent(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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
