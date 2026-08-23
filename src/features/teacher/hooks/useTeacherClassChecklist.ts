import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eduhubTeacherChecklist } from "@/api/eduhubClient";

export const instructorVerifyItemId = "instructor-verify";

function titleForItemKey(itemKey: string): string {
  if (itemKey.startsWith(instructorVerifyItemId)) return "Verify attendance";
  return "Checklist item";
}

export function useTeacherClassChecklist(courseId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["teacher", "class-checklist", courseId] as const, [courseId]);

  const { data } = useQuery({
    queryKey,
    queryFn: () => eduhubTeacherChecklist.list(courseId as string),
    enabled: Boolean(courseId),
  });

  const checked = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const item of data ?? []) {
      if (item.completed) out[item.itemKey] = true;
    }
    return out;
  }, [data]);

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: boolean }) =>
      eduhubTeacherChecklist.setItem(courseId as string, itemId, {
        title: titleForItemKey(itemId),
        completed: value,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const toggle = (itemId: string, value: boolean) => {
    if (!courseId) return;
    toggleMutation.mutate({ itemId, value });
  };

  return {
    checked,
    toggle,
    ready: Boolean(courseId),
    verifyItemId: instructorVerifyItemId,
  };
}
