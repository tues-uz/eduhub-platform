import { useQuery } from "@tanstack/react-query";
import { studentKeys } from "@/api/queryKeys";
import { fetchStudentUpcomingSchedule } from "@/features/student/upcomingSchedule";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";

export function useStudentUpcomingScheduleQuery(limit = 5) {
  const { data: courses = [] } = useStudentCoursesQuery();

  return useQuery({
    queryKey: [...studentKeys.upcomingSchedule(), limit, courses.map((c) => c.id).join(",")],
    queryFn: () => fetchStudentUpcomingSchedule(courses, limit),
    enabled: courses.length > 0,
  });
}
