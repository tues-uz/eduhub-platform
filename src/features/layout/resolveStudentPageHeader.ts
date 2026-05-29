import { studentMenuItems } from "@/features/layout/navigation";

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
      label: "Back to class",
    };
  }

  if (segments[0] === "dashboard" && segments[1] === "courses" && segments[2] && segments.length === 3) {
    return { kind: "back", to: "/dashboard/courses", label: "Back to My Class" };
  }

  if (pathname.startsWith("/dashboard/attendance/join")) {
    return { kind: "empty" };
  }

  const extraPages: { path: string; title: string }[] = [
    { path: "/dashboard/notifications", title: "Notifications" },
    { path: "/dashboard/assignments", title: "Assignments" },
    { path: "/dashboard/schedule", title: "Schedule" },
    { path: "/dashboard/progress", title: "Progress" },
  ];
  const extraSorted = [...extraPages].sort((a, b) => b.path.length - a.path.length);
  for (const e of extraSorted) {
    if (pathname === e.path || pathname.startsWith(`${e.path}/`)) {
      return { kind: "title", title: e.title };
    }
  }

  const sorted = [...studentMenuItems].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path) {
      return { kind: "title", title: item.label };
    }
  }
  for (const item of sorted) {
    if (pathname.startsWith(`${item.path}/`)) {
      if (item.path === "/dashboard/courses") continue;
      return { kind: "title", title: item.label };
    }
  }

  return { kind: "title", title: "EduHub" };
}

/** Sidebar-aligned page name for the sticky dashboard header bar. */
export function resolveStudentNavLabel(pathname: string): string {
  const extraPages: { path: string; title: string }[] = [
    { path: "/dashboard/notifications", title: "Notifications" },
    { path: "/dashboard/assignments", title: "Assignments" },
    { path: "/dashboard/schedule", title: "Schedule" },
    { path: "/dashboard/progress", title: "Progress" },
    { path: "/dashboard/congrats-preview", title: "Congratulations" },
    { path: "/dashboard/attendance/join", title: "Attendance check-in" },
  ];
  const extraSorted = [...extraPages].sort((a, b) => b.path.length - a.path.length);
  for (const page of extraSorted) {
    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      return page.title;
    }
  }

  const sorted = [...studentMenuItems].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      return item.label;
    }
  }

  return "EduHub";
}
