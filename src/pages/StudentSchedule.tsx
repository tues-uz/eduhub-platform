import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calendar, Clock, BookOpen, FileText, Loader2, AlertCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { useStudentUpcomingScheduleQuery } from "@/features/student/hooks/useStudentUpcomingSchedule";
import { useStudentUpcomingAssignmentsQuery } from "@/features/student/hooks/useStudentUpcomingAssignments";
import { formatUpcomingScheduleWhen } from "@/features/student/upcomingSchedule";
import { formatClassDateLabel } from "@/features/courses/classSchedulePreview";

const SCHEDULE_LIMIT = 30;

type ScheduleItem =
  | {
      id: string;
      type: "class";
      title: string;
      time: string;
      location: string;
      courseId: string;
      sortMs: number;
    }
  | {
      id: string;
      type: "assignment";
      title: string;
      due: string;
      courseId: string;
      sortMs: number;
    };

const StudentSchedule = () => {
  const { t } = useTranslation();
  const { isLoading: coursesLoading } = useStudentCoursesQuery();
  const {
    data: upcomingClasses = [],
    isLoading: classesLoading,
    isError: classesError,
    refetch: refetchClasses,
  } = useStudentUpcomingScheduleQuery(SCHEDULE_LIMIT);
  const {
    data: upcomingAssignments = [],
    isLoading: assignmentsLoading,
    isError: assignmentsError,
    refetch: refetchAssignments,
  } = useStudentUpcomingAssignmentsQuery(SCHEDULE_LIMIT);

  const isLoading = coursesLoading || classesLoading || assignmentsLoading;
  const isError = classesError || assignmentsError;

  const items: ScheduleItem[] = [
    ...upcomingClasses.map((c) => ({
      id: `${c.courseId}-${c.sessionDate}-${c.sessionTime}-${c.sessionTitle}`,
      type: "class" as const,
      title: c.sessionTitle,
      time: formatUpcomingScheduleWhen(c.sessionDate, c.sessionTime),
      location: t("schedulePage.online"),
      courseId: c.courseId,
      sortMs: c.startMs,
    })),
    ...upcomingAssignments.map((a) => ({
      id: a.id,
      type: "assignment" as const,
      title: a.title,
      due: formatClassDateLabel(a.dueDate) ?? a.dueDate,
      courseId: a.courseId,
      sortMs: a.dueMs,
    })),
  ].sort((a, b) => a.sortMs - b.sortMs);

  return (
    <div className="container mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-foreground/70 text-sm">{t("schedulePage.subtitle")}</p>
            </div>
            <Button variant="outline" className="rounded-full">
              <Calendar className="mr-2 h-4 w-4" />
              {t("schedulePage.viewCalendar")}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>{t("schedulePage.loading")}</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-4" />
              <p>{t("schedulePage.loadFailed")}</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  refetchClasses();
                  refetchAssignments();
                }}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-20 text-center">
              <Calendar className="mx-auto h-12 w-12 text-foreground/20 mb-4" />
              <p className="text-foreground/40 font-medium">{t("schedulePage.empty")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.type === "class" ? "bg-blue-100" : "bg-purple-100"}`}>
                    {item.type === "class" ? (
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    ) : (
                      <FileText className="h-6 w-6 text-purple-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                      {item.title}
                    </h3>
                    {item.type === "class" ? (
                      <p className="mt-1 flex items-center gap-2 text-sm text-foreground/60">
                        <Clock className="h-4 w-4" />
                        {item.time} · {item.location}
                      </p>
                    ) : (
                      <p className="mt-1 flex items-center gap-2 text-sm text-foreground/60">
                        <Calendar className="h-4 w-4" />
                        {t("schedulePage.due", { date: item.due })}
                      </p>
                    )}
                  </div>
                  <Button size="sm" className="rounded-full flex-shrink-0" style={{ backgroundColor: "#1e40af" }} asChild>
                    {item.type === "class" ? (
                      <Link to={`/dashboard/courses/${encodeURIComponent(item.courseId)}`}>
                        {t("schedulePage.join")}
                      </Link>
                    ) : (
                      <Link to="/dashboard/assignments">{t("schedulePage.open")}</Link>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
    </div>
  );
};

export default StudentSchedule;
