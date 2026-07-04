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

  const createMutation = useMutation({
    mutationFn: (body: TeacherPayload) => createTeacher(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Teacher) => updateTeacher(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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
