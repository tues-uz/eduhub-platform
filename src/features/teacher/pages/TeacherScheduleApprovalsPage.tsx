import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CalendarClock, ChevronRight } from "@/lib/icons";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

function statusBadge(t: TFunction, status: string) {
  switch (status) {
    case "SCHEDULE_PENDING":
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">{t("teacher.scheduleApprovals.status.actionNeeded")}</Badge>
      );
    case "SCHEDULE_APPROVED":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
          {t("teacher.scheduleApprovals.status.approved")}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-900">
          {t("teacher.scheduleApprovals.status.rejected")}
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          {t("teacher.scheduleApprovals.status.draft")}
        </Badge>
      );
    case "PUBLISHED":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
          {t("teacher.scheduleApprovals.status.published")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          {status}
        </Badge>
      );
  }
}

export default function TeacherScheduleApprovalsPage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<CourseSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false;
    setLoading(true);
    eduhubCourses
      .getByLecturer(user.id)
      .then((res) => {
        if (!cancelled) setCourses(res || []);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const pending = courses.filter((c) => c.status === "SCHEDULE_PENDING");
  const other = courses.filter((c) => c.status !== "SCHEDULE_PENDING");

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacherSettings.backToDashboard")}</Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: "0.5px" }}>{t("teacherNav.scheduleApprovals")}</h1>
            <p className="text-foreground/60 text-sm mt-1">
              Review schedules proposed by an admin, then approve or request changes on each class.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-foreground/60">{t("teacher.scheduleApprovals.loading")}</p>
          ) : courses.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2 border-slate-200">
              <CardContent className="py-12 text-center">
                <CalendarClock className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
                <p className="text-sm text-foreground/70">{t("teacher.scheduleApprovals.empty")}</p>
                <Button asChild className="mt-4 rounded-full" style={{ backgroundColor: "#1e40af" }}>
                  <Link to="/dashboard/teacher/courses/new">{t("teacher.courses.addClass")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {pending.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />{t("teacher.scheduleApprovals.pendingSectionTitle")}</h2>
                  <ul className="space-y-3">
                    {pending.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/dashboard/teacher/courses/${c.id}/edit/schedule`}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#1e40af]/40 hover:bg-slate-50/50"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{c.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Created {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {statusBadge(t, c.status)}
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {other.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("teacher.scheduleApprovals.allSectionTitle")}</h2>
                  <div className="space-y-2">
                    {other.map((c) => (
                      <Card key={c.id} className="rounded-xl border-slate-200/90 shadow-sm">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-3 space-y-0">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-medium truncate">{c.title}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {c.status === "SCHEDULE_APPROVED"
                                ? "Schedule approved — waiting for admin to publish"
                                : c.status === "DRAFT"
                                ? "Draft — admin will propose a schedule"
                                : c.status === "REJECTED"
                                ? "Rejected — admin sent feedback"
                                : "Open the schedule step to view or approve when ready."}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {statusBadge(t, c.status)}
                            <Button variant="outline" size="sm" className="rounded-full shrink-0" asChild>
                              <Link to={`/dashboard/teacher/courses/${c.id}/edit/schedule`}>{t("teacher.scheduleApprovals.openButton")}</Link>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
