import type { StudentBrowseableCourse } from "@/features/student/hooks/useStudentBrowseableCourses";

export function filterStudentBrowseableCourses(
  courses: StudentBrowseableCourse[],
  query: string,
  limit = 6,
): StudentBrowseableCourse[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return courses
    .filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export function resolveStudentBrowseableCourseHref(course: StudentBrowseableCourse): string {
  if (course.isEnrolled) {
    return `/dashboard/courses/${encodeURIComponent(course.linkId)}`;
  }
  return `/dashboard/available-courses/class/${encodeURIComponent(course.linkId)}`;
}

export function resolveStudentClassSearchListHref(pathname: string, query: string): string {
  const trimmed = query.trim();
  const base =
    pathname === "/dashboard/courses" || pathname.startsWith("/dashboard/courses/")
      ? "/dashboard/courses"
      : "/dashboard/available-courses";
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
}
