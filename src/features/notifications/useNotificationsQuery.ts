import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotificationsQuery() {
  const { user } = useAuthSession();
  const userKey = (user.email ?? user.phoneNumber ?? user.id ?? "").trim().toLowerCase();

  return useQuery({
    queryKey: [...notificationsQueryKey, userKey],
    queryFn: () => eduhubNotifications.list(),
    enabled: Boolean(user.id || userKey),
  });
}

export function useNotificationMutations() {
  const { user } = useAuthSession();
  const userKey = (user.email ?? user.phoneNumber ?? user.id ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => eduhubNotifications.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>([...notificationsQueryKey, userKey]);
      queryClient.setQueryData<NotificationResponse[]>([...notificationsQueryKey, userKey], (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData([...notificationsQueryKey, userKey], ctx.prev);
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => eduhubNotifications.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>([...notificationsQueryKey, userKey]);
      queryClient.setQueryData<NotificationResponse[]>([...notificationsQueryKey, userKey], (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_err, _ctx, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData([...notificationsQueryKey, userKey], ctx.prev);
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  return { markReadMutation, markAllReadMutation };
}
