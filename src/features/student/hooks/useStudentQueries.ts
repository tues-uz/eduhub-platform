import { useQuery } from "@tanstack/react-query";
import { coursesApi, dashboardApi } from "@/api/client";
import { studentKeys } from "@/api/queryKeys";

export function useStudentOverviewQuery() {
  return useQuery({
    queryKey: studentKeys.overview(),
    queryFn: dashboardApi.getStudentOverview,
  });
}

export function useStudentCoursesQuery() {
  return useQuery({
    queryKey: studentKeys.courses(),
    queryFn: coursesApi.getStudentCourses,
  });
}
