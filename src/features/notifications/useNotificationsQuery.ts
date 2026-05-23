import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";
import {
  APP_NOTIFICATIONS_CHANGE_EVENT,
  appNotificationStore,
  type AppNotification,
} from "@/features/notifications/appNotificationStore";

export const notificationsQueryKey = ["notifications"] as const;

function appNotificationToResponse(notification: AppNotification): NotificationResponse {
  return {
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    refId: notification.refId,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

function mergeStudentNotifications(
  apiNotifications: NotificationResponse[],
  emailNorm: string,
): NotificationResponse[] {
  const localNotifications = appNotificationStore.listForStudent(emailNorm).map(appNotificationToResponse);
  const byId = new Map<string, NotificationResponse>();

  for (const notification of apiNotifications) {
    byId.set(notification.id, notification);
  }
  for (const notification of localNotifications) {
    byId.set(notification.id, notification);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function fetchStudentNotifications(emailNorm: string): Promise<NotificationResponse[]> {
  let apiNotifications: NotificationResponse[] = [];

  try {
    apiNotifications = await eduhubNotifications.list();
  } catch {
    apiNotifications = [];
  }

  return mergeStudentNotifications(apiNotifications, emailNorm);
}

function isLocalNotificationId(id: string): boolean {
  return appNotificationStore.list().some((notification) => notification.id === id);
}

export function useNotificationsQuery() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onChange = () => void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, onChange);
  }, [queryClient]);

  return useQuery({
    queryKey: [...notificationsQueryKey, emailNorm],
    queryFn: () => fetchStudentNotifications(emailNorm),
    enabled: Boolean(emailNorm),
  });
}

export function useNotificationMutations() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isLocalNotificationId(id)) {
        appNotificationStore.markRead(id);
        return;
      }
      await eduhubNotifications.markRead(id);
    },
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
    mutationFn: async () => {
      if (emailNorm) {
        appNotificationStore.markAllReadForStudent(emailNorm);
      }
      try {
        await eduhubNotifications.markAllRead();
      } catch {
        /* Local-only notifications are still marked read above. */
      }
    },
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
