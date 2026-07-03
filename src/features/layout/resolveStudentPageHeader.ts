import { studentMenuItems } from "@/features/layout/navigation";
import i18n from "@/i18n";

export type StudentPageHeaderResolved =
  | { kind: "back"; to: string; label: string }
  | { kind: "title"; title: string }
  | { kind: "empty" };

/**
 * Default header for student dashboard routes (aligned with sidebar nav + nested paths).
 */
export function resolveStudentPageHeader(pathname: string): StudentPageHeaderResolved {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments[0] === "dashboard" &&
    segments[1] === "available-courses" &&
    segments[2] === "class" &&
    segments[3]
  ) {
    return { kind: "empty" };
  }

  /** Title and actions live in page content (StudentCourses). */
  if (pathname === "/dashboard/courses") {
    return { kind: "empty" };
  }

  /** Title is shown in page content (StudentAvailableCourses). */
  if (pathname === "/dashboard/available-courses") {
    return { kind: "empty" };
  }

  if (
    segments[0] === "dashboard" &&
    segments[1] === "courses" &&
    segments[2] &&
    segments[3] === "resume" &&
    segments[4]
  ) {
    return { kind: "empty" };
  }

  if (pathname === "/dashboard/congrats-preview") {
    return { kind: "empty" };
  }

  if (
    segments[0] === "dashboard" &&
    segments[1] === "courses" &&
    segments[2] &&
    segments[3] === "lessons" &&
    segments[4]
  ) {
    const courseId = segments[2];
    return {
      kind: "back",
      to: `/dashboard/courses/${encodeURIComponent(courseId)}`,
      label: i18n.t("pageHeader.backToClass"),
    };
  }

  if (segments[0] === "dashboard" && segments[1] === "courses" && segments[2] && segments.length === 3) {
    return { kind: "back", to: "/dashboard/courses", label: i18n.t("pageHeader.backToMyClass") };
  }

  if (pathname.startsWith("/dashboard/attendance/join")) {
    return { kind: "empty" };
  }

  const extraPages: { path: string; titleKey: string }[] = [
    { path: "/dashboard/notifications", titleKey: "pageHeader.notifications" },
    { path: "/dashboard/assignments", titleKey: "pageHeader.assignments" },
    { path: "/dashboard/schedule", titleKey: "pageHeader.schedule" },
    { path: "/dashboard/progress", titleKey: "pageHeader.progress" },
  ];
  const extraSorted = [...extraPages].sort((a, b) => b.path.length - a.path.length);
  for (const e of extraSorted) {
    if (pathname === e.path || pathname.startsWith(`${e.path}/`)) {
      return { kind: "title", title: i18n.t(e.titleKey) };
    }
  }

  const sorted = [...studentMenuItems].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path) {
      return { kind: "title", title: i18n.t(item.labelKey) };
    }
  }
  for (const item of sorted) {
    if (pathname.startsWith(`${item.path}/`)) {
      if (item.path === "/dashboard/courses") continue;
      return { kind: "title", title: i18n.t(item.labelKey) };
    }
  }

  return { kind: "title", title: i18n.t("pageHeader.appName") };
}

/** Sidebar-aligned page name for the sticky dashboard header bar. */
export function resolveStudentNavLabel(pathname: string): string {
  const extraPages: { path: string; titleKey: string }[] = [
    { path: "/dashboard/notifications", titleKey: "pageHeader.notifications" },
    { path: "/dashboard/assignments", titleKey: "pageHeader.assignments" },
    { path: "/dashboard/schedule", titleKey: "pageHeader.schedule" },
    { path: "/dashboard/progress", titleKey: "pageHeader.progress" },
    { path: "/dashboard/congrats-preview", titleKey: "pageHeader.congratulations" },
    { path: "/dashboard/attendance/join", titleKey: "pageHeader.attendanceCheckIn" },
  ];
  const extraSorted = [...extraPages].sort((a, b) => b.path.length - a.path.length);
  for (const page of extraSorted) {
    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      return i18n.t(page.titleKey);
    }
  }

  const sorted = [...studentMenuItems].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      return i18n.t(item.labelKey);
    }
  }

  return i18n.t("pageHeader.appName");
}
