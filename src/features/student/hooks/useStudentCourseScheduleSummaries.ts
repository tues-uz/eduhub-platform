import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { StudentCourseListItem } from "@/api/client";
import { studentKeys } from "@/api/queryKeys";
import {
  fetchCourseScheduleSummary,
  type CourseScheduleSummary,
} from "@/features/student/courseScheduleSummary";

export function useStudentCourseScheduleSummaries(courses: StudentCourseListItem[]) {
  const queries = useQueries({
    queries: courses.map((course) => ({
      queryKey: studentKeys.courseScheduleSummary(String(course.id)),
      queryFn: () => fetchCourseScheduleSummary(String(course.id)),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const map = new Map<string, CourseScheduleSummary>();
    courses.forEach((course, index) => {
      const summary = queries[index]?.data;
      if (summary) map.set(String(course.id), summary);
    });
    return map;
  }, [courses, queries]);
}
