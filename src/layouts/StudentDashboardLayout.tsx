import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { DashboardPageHeader } from "@/components/DashboardPageHeader";
import { useLayoutContext } from "@/features/layout/context";
import { resolveStudentPageHeader } from "@/features/layout/resolveStudentPageHeader";
import { cn } from "@/lib/utils";

/** Full-bleed hero on class detail: no extra gap below sticky page header. */
const AVAILABLE_CLASS_DETAIL_PATH = /^\/dashboard\/available-courses\/class\/[^/]+$/;
/** My Class → single course (not lesson): hero strip flush under header. */
const STUDENT_COURSE_ROOT_PATH = /^\/dashboard\/courses\/[^/]+$/;

/**
 * Shared shell for student dashboard routes: sidebar, global page header (sidebar-aligned height), and content.
 */
export default function StudentDashboardLayout() {
  const { isSidebarCollapsed } = useLayoutContext();
  const { pathname } = useLocation();
  const headerConfig = resolveStudentPageHeader(pathname);
  const flushContentBelowHeader =
    AVAILABLE_CLASS_DETAIL_PATH.test(pathname) || STUDENT_COURSE_ROOT_PATH.test(pathname);

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />

      <main
        className={`flex min-h-[calc(100dvh-4rem)] flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:min-h-0 pt-16 lg:pt-0 pb-0 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:ml-20 lg:w-[calc(100%-5rem)]" : "lg:ml-64 lg:w-[calc(100%-16rem)]"
        }`}
      >
        <DashboardPageHeader />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-6 pb-6 lg:overflow-y-auto lg:overscroll-y-contain",
            flushContentBelowHeader ? "pt-0" : "pt-4",
          )}
        >
          {headerConfig.kind === "title" ? (
            <h1
              className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" }}
            >
              {headerConfig.title}
            </h1>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
