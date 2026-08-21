import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotificationsQuery() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();

  return useQuery({
    queryKey: [...notificationsQueryKey, emailNorm],
    queryFn: () => eduhubNotifications.list(),
    enabled: Boolean(emailNorm),
  });
}

export function useNotificationMutations() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => eduhubNotifications.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>([...notificationsQueryKey, emailNorm]);
      queryClient.setQueryData<NotificationResponse[]>([...notificationsQueryKey, emailNorm], (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData([...notificationsQueryKey, emailNorm], ctx.prev);
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => eduhubNotifications.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>([...notificationsQueryKey, emailNorm]);
      queryClient.setQueryData<NotificationResponse[]>([...notificationsQueryKey, emailNorm], (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_err, _ctx, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData([...notificationsQueryKey, emailNorm], ctx.prev);
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  return { markReadMutation, markAllReadMutation };
}
