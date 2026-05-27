import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { DashboardPageHeader, MOBILE_STUDENT_HEADER_OFFSET } from "@/components/DashboardPageHeader";
import { useLayoutContext } from "@/features/layout/context";
import { resolveStudentPageHeader } from "@/features/layout/resolveStudentPageHeader";
import { cn } from "@/lib/utils";

/** Full-bleed hero on class detail: no extra gap below sticky page header. */
const AVAILABLE_CLASS_DETAIL_PATH = /^\/dashboard\/available-courses\/class\/[^/]+$/;
/** My Class → single course (not lesson): hero strip flush under header. */
const STUDENT_COURSE_ROOT_PATH = /^\/dashboard\/courses\/[^/]+$/;
const STUDENT_COURSE_RESUME_PATH = /^\/dashboard\/courses\/[^/]+\/resume\/[^/]+$/;
const STUDENT_ATTENDANCE_JOIN_PATH = /^\/dashboard\/attendance\/join\/?$/;

/**
 * Shared shell for student dashboard routes: sidebar, global page header (sidebar-aligned height), and content.
 */
export default function StudentDashboardLayout() {
  const { isSidebarCollapsed } = useLayoutContext();
  const { pathname } = useLocation();
  const headerConfig = resolveStudentPageHeader(pathname);
  const isAttendanceJoin = STUDENT_ATTENDANCE_JOIN_PATH.test(pathname);
  const flushContentBelowHeader =
    AVAILABLE_CLASS_DETAIL_PATH.test(pathname) ||
    STUDENT_COURSE_ROOT_PATH.test(pathname) ||
    STUDENT_COURSE_RESUME_PATH.test(pathname);

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />

      <main
        className={`flex min-h-[calc(100dvh-4rem)] flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:min-h-0 ${MOBILE_STUDENT_HEADER_OFFSET} lg:pt-0 pb-0 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:ml-20 lg:w-[calc(100%-5rem)]" : "lg:ml-64 lg:w-[calc(100%-16rem)]"
        }`}
      >
        {!STUDENT_COURSE_RESUME_PATH.test(pathname) ? <DashboardPageHeader /> : null}
        <div
          className={cn(
            "min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-y-contain",
            isAttendanceJoin && "flex flex-col",
            STUDENT_COURSE_RESUME_PATH.test(pathname)
              ? "p-0"
              : cn(
                  "px-6 pt-4 pb-12",
                  flushContentBelowHeader && "pt-0",
                  isAttendanceJoin && "pb-6",
                ),
          )}
        >
          {headerConfig.kind === "title" ? (
            <h1
              className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {headerConfig.title}
            </h1>
          ) : null}
          <div className={cn(isAttendanceJoin && "flex flex-1 flex-col items-center justify-center")}>
            <Outlet />
          </div>
          {!STUDENT_COURSE_RESUME_PATH.test(pathname) && !isAttendanceJoin ? (
            <div className="h-8 w-full shrink-0" aria-hidden />
          ) : null}
        </div>
      </main>
    </div>
  );
}
