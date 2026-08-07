import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  BarChart3,
  Target,
  Clock,
  Loader2,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardSidebar from "@/components/DashboardSidebar";
import { DashboardPageHeader, MOBILE_STUDENT_HEADER_OFFSET } from "@/components/DashboardPageHeader";
import { InstructorAvatar } from "@/components/InstructorAvatar";
import { useAuthSession } from "@/features/auth/context";
import { useLayoutContext } from "@/features/layout/context";
import { studentStats } from "@/features/student/data/dashboardData";
import {
  useStudentCertificatesQuery,
  useStudentCoursesQuery,
  useStudentOverviewQuery,
} from "@/features/student/hooks/useStudentQueries";
import { useStudentUpcomingScheduleQuery } from "@/features/student/hooks/useStudentUpcomingSchedule";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import { formatSessionTimeLabel, sessionStartMs } from "@/features/courses/classSchedulePreview";
import {
  formatUpcomingScheduleDayLabel,
} from "@/features/student/upcomingSchedule";
import type { UpcomingScheduleItem } from "@/features/student/upcomingSchedule";

const STAT_LABEL_KEYS: Record<string, string> = {
  "/dashboard/courses": "dashboard.statsClassesEnrolled",
  "/dashboard/certificates": "dashboard.statsCertificates",
  "/dashboard/progress": "dashboard.statsProgress",
};

function formatScheduleCountdownShort(
  sessionDate: string,
  sessionTime: string,
  nowMs: number,
  locale: string,
): string | null {
  const start = sessionStartMs(sessionDate, sessionTime);
  if (start == null) return null;

  const diff = start - nowMs;
  if (diff <= 0) return null;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "short" });
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return rtf.format(1, "minute");
  if (minutes < 60) return rtf.format(minutes, "minute");
  if (hours < 24) return rtf.format(hours, "hour");
  if (days < 7) return rtf.format(days, "day");

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return rtf.format(weeks, "week");
  return rtf.format(days, "day");
}

function formatRelativeTime(dateString: string, locale: string): string {
  const t = new Date(dateString).getTime();
  if (Number.isNaN(t)) return dateString;
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "long" });
  if (mins < 1) return rtf.format(0, "minute");
  if (mins < 60) return rtf.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return new Date(dateString).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

function UpcomingScheduleCard({ item }: { item: UpcomingScheduleItem }) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const startMs = sessionStartMs(item.sessionDate, item.sessionTime);
  const date = startMs != null ? new Date(startMs) : null;
  const locale = i18n.language;
  const monthLabel = date
    ? date.toLocaleDateString(locale, { month: "short" }).toUpperCase()
    : t("dashboard.tba");
  const dayLabel = date ? String(date.getDate()) : "—";
  const weekdayLabel = date
    ? date.toLocaleDateString(locale, { weekday: "short" })
    : null;
  const timeLabel = formatSessionTimeLabel(item.sessionTime);
  const relativeDay = formatUpcomingScheduleDayLabel(item.sessionDate);
  const translatedRelativeDay =
    relativeDay === "Today"
      ? t("dashboard.today")
      : relativeDay === "Tomorrow"
        ? t("dashboard.tomorrow")
        : relativeDay === "Date TBA"
          ? null
          : relativeDay;
  const countdownShort =
    item.timingStatus === "ongoing"
      ? null
      : formatScheduleCountdownShort(item.sessionDate, item.sessionTime, now, locale);
  const isOngoing = item.timingStatus === "ongoing";

  return (
    <Link
      to={`/dashboard/courses/${encodeURIComponent(item.courseId)}`}
      className="group flex gap-4 rounded-2xl border border-zinc-200/80 bg-white p-ov-16 transition-all hover:border-[#3954d0]/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3954d0] focus-visible:ring-offset-2"
    >
      <div
        className={cn(
          "flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center transition-colors",
          isOngoing
            ? "border-emerald-200 bg-emerald-50"
            : "border-zinc-100 bg-zinc-50 group-hover:border-[#3954d0]/15 group-hover:bg-[#3954d0]/[0.04]",
        )}
      >
        <span className="text-[10px] font-semibold tracking-wider text-zinc-500">{monthLabel}</span>
        <span className="mt-0.5 text-2xl font-bold leading-none text-zinc-900">{dayLabel}</span>
        {weekdayLabel ? (
          <span className="mt-1 text-[10px] font-medium text-zinc-500">{weekdayLabel}</span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {item.courseTitle}
            </p>
            <h3
              className="mt-0.5 truncate text-base font-semibold text-zinc-900"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2px" }}
            >
              {item.sessionTitle}
            </h3>
          </div>
          {isOngoing ? (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              {t("dashboard.live")}
            </span>
          ) : countdownShort ? (
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
              {countdownShort}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <InstructorAvatar
              name={item.instructor}
              avatarUrl={item.instructorAvatarUrl}
              className="h-5 w-5"
            />
            <span className="truncate">{formatDisplayPersonName(item.instructor)}</span>
          </span>
          {timeLabel ? (
            <>
              <span className="text-zinc-300" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                {timeLabel}
              </span>
            </>
          ) : null}
          {translatedRelativeDay ? (
            <>
              <span className="text-zinc-300" aria-hidden>
                ·
              </span>
              <span className="font-medium text-zinc-700">{translatedRelativeDay}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

type DashboardStat = {
  label: string;
  value: string;
  icon: typeof BookOpen;
  href?: string;
};

function DashboardStatCard({
  label,
  value,
  icon: Icon,
  href = "/dashboard",
  className,
}: DashboardStat & { className?: string }) {
  return (
    <Link
      to={href}
      className={cn(
        "group flex w-full min-w-0 flex-col bg-white px-5 py-5 transition-colors hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3954d0] sm:px-6",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        <Icon
          className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-500"
          aria-hidden
        />
        {label}
      </span>
      <span
        className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {value}
      </span>
    </Link>
  );
}

function dashboardStatBorderClass(index: number, total: number): string {
  return cn(
    index < total - 1 && "sm:border-r sm:border-zinc-200/80",
    index < total - 1 && "max-sm:border-b max-sm:border-zinc-200/80",
  );
}

function WelcomeWave() {
  return (
    <span className="wave wave--inline wave--play-animation inline-flex shrink-0 align-middle" aria-hidden>
      👋
    </span>
  );
}

const StudentDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthSession();
  const { isSidebarCollapsed } = useLayoutContext();
  const { data } = useStudentOverviewQuery();
  const { data: enrolledCourses = [], isLoading: coursesLoading } = useStudentCoursesQuery();
  const { data: certificates = [] } = useStudentCertificatesQuery();
  const { data: upcomingSchedule = [], isLoading: scheduleLoading } = useStudentUpcomingScheduleQuery(5);
  const displayName = formatDisplayPersonName(user.name);

  const courseCount = enrolledCourses.length;
  const completedCourseCount = enrolledCourses.filter((c) => c.progress >= 100).length;
  const avgProgress =
    courseCount > 0
      ? Math.round(
          enrolledCourses.reduce((sum, c) => sum + (typeof c.progress === "number" ? c.progress : 0), 0) /
            courseCount,
        )
      : null;
  const avgCertificateScore =
    certificates.length > 0
      ? Math.round(
          certificates.reduce((sum, cert) => sum + (cert.totalFinalScore ?? 0), 0) / certificates.length,
        )
      : null;

  const statCards = useMemo(() => {
    const base = (data?.stats ?? [...studentStats]).map((s) => ({ ...s }));

    return base.map((stat) => {
      const href = "href" in stat && typeof stat.href === "string" ? stat.href : "/dashboard";
      if (href === "/dashboard/courses") {
        return { ...stat, value: String(courseCount) };
      }
      if (href === "/dashboard/certificates") {
        return { ...stat, value: String(certificates.length) };
      }
      if (href === "/dashboard/progress" && avgProgress != null) {
        return { ...stat, value: `${avgProgress}%` };
      }
      return stat;
    });
  }, [data?.stats, courseCount, certificates.length, avgProgress]);
  const recentActivity = data?.recentActivity ?? [];

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />

      <main
        className={`flex min-h-[calc(100dvh-4rem)] flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:min-h-0 ${MOBILE_STUDENT_HEADER_OFFSET} lg:pt-0 pb-0 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:ml-20 lg:w-[calc(100%-5rem)]" : "lg:ml-64 lg:w-[calc(100%-16rem)]"
        }`}
      >
        <DashboardPageHeader />
        <div className="min-h-0 flex-1 px-6 pt-4 pb-12 lg:overflow-y-auto lg:overscroll-y-contain">
        <div className="container mx-auto px-0">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="mb-6 space-y-1">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[32px] font-bold leading-tight tracking-tight text-foreground">
                <span>{t("dashboard.welcome", { name: displayName })}</span>
                <WelcomeWave />
              </h1>
              <p className="text-foreground/70" style={{ fontSize: "14px" }}>
                {t("dashboard.subtitle")}
              </p>
            </div>

            {/* Stats */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-3">
                {statCards.map((stat, index) => {
                  const href = "href" in stat && typeof stat.href === "string" ? stat.href : "/dashboard";
                  const labelKey = STAT_LABEL_KEYS[href];
                  return (
                    <DashboardStatCard
                      key={href}
                      label={labelKey ? t(labelKey) : stat.label}
                      value={stat.value}
                      icon={stat.icon}
                      href={href}
                      className={dashboardStatBorderClass(index, statCards.length)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Schedule */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold leading-tight text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("dashboard.upcomingSchedule")}</h2>
                  <Link to="/dashboard/schedule">
                    <Button variant="ghost" className="h-auto px-0 py-0 text-sm text-zinc-400 hover:bg-transparent hover:text-zinc-500">
                      {t("dashboard.viewAll")}
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {coursesLoading || scheduleLoading ? (
                    <p className="py-8 text-center text-sm text-foreground/60">{t("dashboard.loadingSchedule")}</p>
                  ) : enrolledCourses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
                      <Calendar className="mx-auto mb-3 h-10 w-10 text-foreground/30" />
                      <p className="font-medium text-foreground/70">{t("dashboard.noEnrolledTitle")}</p>
                      <p className="mt-1 text-sm text-foreground/50">{t("dashboard.noEnrolledHint")}</p>
                      <Link to="/dashboard/available-courses">
                        <Button className="mt-4 rounded-full" style={{ backgroundColor: "#3954d0" }}>
                          {t("dashboard.browseClasses")}
                        </Button>
                      </Link>
                    </div>
                  ) : upcomingSchedule.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
                      <Calendar className="mx-auto mb-3 h-10 w-10 text-foreground/30" />
                      <p className="font-medium text-foreground/70">{t("dashboard.noSessionsTitle")}</p>
                      <p className="mt-1 text-sm text-foreground/50">{t("dashboard.noSessionsHint")}</p>
                      <Link to="/dashboard/courses">
                        <Button variant="outline" className="mt-4 rounded-full">
                          {t("dashboard.viewMyClass")}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    upcomingSchedule.map((item) => (
                      <UpcomingScheduleCard key={`${item.courseId}-${item.sessionDate}-${item.sessionTime}-${item.sessionTitle}`} item={item} />
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 px-4 py-6">
                <h2 className="mb-4 text-xl font-bold leading-tight text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("dashboard.quickActions")}</h2>
                <div className="flex flex-col gap-2">
                  <Link to="/dashboard/available-courses" className="block">
                    <Button className="w-full justify-start rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t("dashboard.browseClasses")}
                    </Button>
                  </Link>
                  <Link to="/dashboard/certificates" className="block">
                    <Button className="w-full justify-start rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      {t("dashboard.statsCertificates")}
                    </Button>
                  </Link>
                  <Link to="/dashboard/progress" className="block">
                    <Button className="w-full justify-start rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {t("dashboard.viewProgress")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6">
                <h2 className="mb-4 text-xl font-bold leading-tight text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("dashboard.recentActivity")}</h2>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-foreground/50">{t("dashboard.noRecentActivity")}</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {activity.type === "completed" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          {activity.type === "certificate" && <Award className="h-4 w-4 text-orange-600" />}
                          {activity.type === "enrolled" && <BookOpen className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{activity.text}</p>
                          <p className="text-xs text-foreground/60 mt-1">{formatRelativeTime(activity.time, i18n.language)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Overview */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6" />
                  <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t("dashboard.overallProgress")}</h2>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{t("dashboard.completionRate")}</span>
                    <span className="text-2xl font-bold">{avgProgress ?? 0}%</span>
                  </div>
                  <Progress value={avgProgress ?? 0} className="h-3 bg-white/20" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm opacity-90">{t("dashboard.classesCompleted")}</p>
                    <p className="text-2xl font-bold">{completedCourseCount}/{courseCount}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">{t("dashboard.avgScore")}</p>
                    <p className="text-2xl font-bold">{avgCertificateScore != null ? `${avgCertificateScore}%` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-8 w-full shrink-0" aria-hidden />
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
