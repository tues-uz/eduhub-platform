import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Clock, Loader2, Search } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotificationResponse } from "@/api/eduhubTypes";
import {
  formatNotificationRelativeTime,
  NotificationBodyText,
  notificationIconToneBgClass,
  NotificationKindIcon,
  resolveNotificationIcon,
  resolveStudentNotificationCategory,
  type StudentNotificationCategory,
} from "@/features/notifications/notificationDisplay";
import {
  useNotificationMutations,
  useNotificationsQuery,
} from "@/features/notifications/useNotificationsQuery";

type CategoryFilter = "all" | StudentNotificationCategory;
type ReadFilter = "all" | "unread" | "read";

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; labelKey: string }[] = [
  { value: "all", labelKey: "notificationsPage.filterAllTypes" },
  { value: "enrollment", labelKey: "notificationsPage.filterEnrollment" },
  { value: "class", labelKey: "notificationsPage.filterClass" },
  { value: "payment", labelKey: "notificationsPage.filterPayment" },
  { value: "certificate", labelKey: "notificationsPage.filterCertificate" },
  { value: "schedule", labelKey: "notificationsPage.filterSchedule" },
  { value: "attendance", labelKey: "notificationsPage.filterAttendance" },
  { value: "other", labelKey: "notificationsPage.filterOther" },
];

const READ_FILTER_OPTIONS: { value: ReadFilter; labelKey: string }[] = [
  { value: "all", labelKey: "common.all" },
  { value: "unread", labelKey: "notificationsPage.filterUnread" },
  { value: "read", labelKey: "notificationsPage.filterRead" },
];

const StudentNotifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const { markReadMutation, markAllReadMutation } = useNotificationMutations();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const categoryFilterLabel =
    t(CATEGORY_FILTER_OPTIONS.find((option) => option.value === categoryFilter)?.labelKey ?? "notificationsPage.filterAllTypes");
  const readFilterLabel =
    t(READ_FILTER_OPTIONS.find((option) => option.value === readFilter)?.labelKey ?? "common.all");

  const hasActiveFilters =
    search.trim().length > 0 || categoryFilter !== "all" || readFilter !== "all";

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        !q ||
        [notification.title, notification.body, notification.kind]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const category = resolveStudentNotificationCategory(notification.kind, notification.title);
      const matchesCategory = categoryFilter === "all" || category === categoryFilter;

      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" ? !notification.read : notification.read);

      return matchesSearch && matchesCategory && matchesRead;
    });
  }, [notifications, search, categoryFilter, readFilter]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setReadFilter("all");
  };

  const onRowClick = (notification: NotificationResponse) => {
    if (!notification.read) markReadMutation.mutate(notification.id);
    if (notification.href) navigate(notification.href);
  };

  return (
    <div
      className="w-full"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="mb-8">
        <p className="text-foreground/70 text-sm">{t("notificationsPage.subtitle")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            {t("notificationsPage.unread", { count: unreadCount })}
          </span>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {t("notificationsPage.markAllRead")}
            </Button>
          ) : null}
        </div>
      </div>

      {!isLoading && notifications.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-0 w-full max-w-md sm:w-auto sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("notificationsPage.searchPlaceholder")}
              className="h-10 rounded-xl border-gray-200 pl-10"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-[120px] shrink-0 justify-between rounded-xl border-gray-200 bg-white px-2.5 text-sm font-normal text-foreground hover:bg-gray-50 data-[state=open]:border-gray-300 data-[state=open]:ring-2 data-[state=open]:ring-[#3954d0]/15"
                >
                  <span className="truncate">{categoryFilterLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[120px] rounded-2xl border-gray-200 p-2 shadow-lg">
                {CATEGORY_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={cn(
                      "cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100",
                      categoryFilter === option.value && "bg-gray-50 font-medium text-foreground",
                    )}
                    onClick={() => setCategoryFilter(option.value)}
                  >
                    {t(option.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-[96px] shrink-0 justify-between rounded-xl border-gray-200 bg-white px-2.5 text-sm font-normal text-foreground hover:bg-gray-50 data-[state=open]:border-gray-300 data-[state=open]:ring-2 data-[state=open]:ring-[#3954d0]/15"
                >
                  <span className="truncate">{readFilterLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[96px] rounded-2xl border-gray-200 p-2 shadow-lg">
                {READ_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={cn(
                      "cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100",
                      readFilter === option.value && "bg-gray-50 font-medium text-foreground",
                    )}
                    onClick={() => setReadFilter(option.value)}
                  >
                    {t(option.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : null}

      {!isLoading && notifications.length > 0 ? (
        <p className="mb-4 text-sm text-foreground/60">
          {t("notificationsPage.count", { count: filteredNotifications.length })}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("notificationsPage.loading")}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const iconTone = resolveNotificationIcon(notification.kind, notification.title).tone;

              return (
              <button
                key={notification.id}
                type="button"
                onClick={() => onRowClick(notification)}
                className={`w-full rounded-xl border p-5 text-left transition-colors ${
                  notification.read
                    ? "border-gray-200/50 bg-white/80 hover:bg-gray-50/50"
                    : "border-blue-200/50 bg-blue-50/50 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${notificationIconToneBgClass(iconTone)}`}
                  >
                    <NotificationKindIcon
                      kind={notification.kind}
                      title={notification.title}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          notification.read ? "text-foreground/80" : "text-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                    </div>
                    <NotificationBodyText body={notification.body} className="mt-1 text-sm text-foreground/60" />
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground/50">
                      <Clock className="h-3.5 w-3.5" />
                      {formatNotificationRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
            })}
          </div>

          {filteredNotifications.length === 0 && (
            <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
              <p className="font-medium text-foreground/70">
                {notifications.length === 0
                  ? t("notificationsPage.emptyTitle")
                  : t("notificationsPage.noMatchTitle")}
              </p>
              <p className="mt-1 text-sm text-foreground/50">
                {notifications.length === 0
                  ? t("notificationsPage.emptyHint")
                  : t("notificationsPage.noMatchHint")}
              </p>
              {notifications.length > 0 && hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={clearFilters}
                >
                  {t("notificationsPage.clearFilters")}
                </Button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentNotifications;
