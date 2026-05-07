import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CalendarClock, ChevronRight } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import type { TeacherCourse } from "@/features/teacher/types";
import { courseScheduleWorkflowStore, type ScheduleWorkflowStatus } from "@/features/courses/courseScheduleWorkflowStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  title: string;
  status: ScheduleWorkflowStatus | "no_record";
  proposedAt?: string;
  rejectionNote?: string;
};

function statusBadge(row: Row) {
  switch (row.status) {
    case "pending_instructor":
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
          Action needed
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
          Approved
        </Badge>
      );
    case "instructor_rejected":
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-900">
          Changes requested
        </Badge>
      );
    case "none":
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          Draft only
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          No request yet
        </Badge>
      );
  }
}

export default function TeacherScheduleApprovalsPage() {
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowTick, setWorkflowTick] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const local = teacherCoursesStore.getAll();
      if (user.id) {
        try {
          const res = await eduhubCourses.getByLecturer(user.id);
          const apiCourses: TeacherCourse[] = (res || []).map((c) => ({
            id: c.id,
            title: c.title,
            description: "",
            instructorName: c.lecturerName,
            thumbnailUrl: c.thumbnailUrl,
            enrollmentCount: c.enrollmentCount,
            classMeetingsInSixMonths: c.classMeetingsInSixMonths,
            lessons: [],
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
            status: c.status,
          }));
          const merged = [...apiCourses, ...local.filter((l) => !isUuid(l.id))];
          if (!cancelled) setCourses(merged);
        } catch {
          if (!cancelled) setCourses(local);
        }
      } else {
        if (!cancelled) setCourses(local);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    const bump = () => setWorkflowTick((t) => t + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "eduhub.courseScheduleWorkflow.v1") bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const rows = useMemo(() => {
    void workflowTick;
    const out: Row[] = [];
    for (const c of courses) {
      if (!isUuid(c.id)) continue;
      const w = courseScheduleWorkflowStore.get(c.id);
      const status: ScheduleWorkflowStatus | "no_record" = w?.status ?? "no_record";
      out.push({
        id: c.id,
        title: c.title,
        status,
        proposedAt: w?.proposedAt,
        rejectionNote: w?.rejectionNote,
      });
    }
    return out.sort((a, b) => {
      const pri = (s: Row["status"]) =>
        s === "pending_instructor" ? 0 : s === "instructor_rejected" ? 1 : s === "none" ? 2 : s === "no_record" ? 3 : 4;
      return pri(a.status) - pri(b.status) || a.title.localeCompare(b.title);
    });
  }, [courses, workflowTick]);

  const pending = rows.filter((r) => r.status === "pending_instructor");
  const other = rows.filter((r) => r.status !== "pending_instructor");

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
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: "0.5px" }}>
              Schedule approvals
            </h1>
            <p className="text-foreground/60 text-sm mt-1">
              Review schedules proposed by an admin, then approve or request changes on each class.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-foreground/60">Loading your classes…</p>
          ) : rows.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2 border-slate-200">
              <CardContent className="py-12 text-center">
                <CalendarClock className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
                <p className="text-sm text-foreground/70">No API-linked classes yet. Create a class first.</p>
                <Button asChild className="mt-4 rounded-full" style={{ backgroundColor: "#1e40af" }}>
                  <Link to="/dashboard/teacher/courses/new">Add class</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  Needs your approval
                </h2>
                {pending.length === 0 ? (
                  <p className="text-sm text-foreground/60 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    Nothing waiting right now. When an admin sends a schedule, it will show up here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {pending.map((r) => (
                      <li key={r.id}>
                        <Link
                          to={`/dashboard/teacher/courses/${r.id}/edit/schedule`}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#1e40af]/40 hover:bg-slate-50/50"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{r.title}</p>
                            {r.proposedAt ? (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Sent {new Date(r.proposedAt).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {statusBadge(r)}
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {other.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">All your classes</h2>
                  <div className="space-y-2">
                    {other.map((r) => (
                      <Card key={r.id} className="rounded-xl border-slate-200/90 shadow-sm">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-3 space-y-0">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-medium truncate">{r.title}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {r.status === "instructor_rejected" && r.rejectionNote
                                ? `Your note: ${r.rejectionNote}`
                                : "Open the schedule step to view or approve when ready."}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {statusBadge(r)}
                            <Button variant="outline" size="sm" className="rounded-full shrink-0" asChild>
                              <Link to={`/dashboard/teacher/courses/${r.id}/edit/schedule`}>Open</Link>
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
