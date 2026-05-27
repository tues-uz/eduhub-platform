import { Link, useNavigate } from "react-router-dom";
import { Bell, Clock, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatNotificationRelativeTime,
  formatUnreadNotificationBadge,
  NotificationBodyText,
  NotificationKindIcon,
} from "@/features/notifications/notificationDisplay";
import {
  useNotificationMutations,
  useNotificationsQuery,
} from "@/features/notifications/useNotificationsQuery";
import { cn } from "@/lib/utils";
import { studentHeaderIconButtonClass } from "@/components/studentDashboardHeaderStyles";
import type { NotificationResponse } from "@/api/eduhubTypes";

type StudentNotificationDropdownProps = {
  triggerClassName?: string;
};

export function StudentNotificationDropdown({ triggerClassName }: StudentNotificationDropdownProps) {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const { markReadMutation, markAllReadMutation } = useNotificationMutations();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const onNotificationClick = (notification: NotificationResponse) => {
    if (!notification.read) markReadMutation.mutate(notification.id);
    if (notification.href) navigate(notification.href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(studentHeaderIconButtonClass, "relative", triggerClassName)}
          aria-label="Notifications"
        >
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white",
                unreadCount > 9 ? "min-w-[22px]" : "min-w-5",
              )}
            >
              {formatUnreadNotificationBadge(unreadCount)}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex w-80 max-h-96 flex-col overflow-hidden rounded-2xl p-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
          >
            Notifications
          </h3>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-0 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-2">
          <div className="space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-foreground/60">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className={cn(
                    "w-full rounded-xl p-3 text-left transition-colors",
                    !notification.read ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <NotificationKindIcon kind={notification.kind} title={notification.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              !notification.read ? "text-foreground" : "text-foreground/70",
                            )}
                          >
                            {notification.title}
                          </p>
                          <NotificationBodyText
                            body={notification.body}
                            className="mt-1 text-xs text-foreground/60"
                          />
                          <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50">
                            <Clock className="h-3 w-3" aria-hidden />
                            {formatNotificationRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          {!isLoading && notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-foreground/60">No notifications</div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-popover px-4 py-3">
          <Link to="/dashboard/notifications">
            <Button size="sm" className="w-full rounded-full bg-[#3954d0] text-sm hover:bg-[#3954d0]/90">
              View all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
