import { useQuery } from "@tanstack/react-query";
import { studentKeys } from "@/api/queryKeys";
import { fetchStudentUpcomingAssignments } from "@/features/student/upcomingAssignments";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";

export function useStudentUpcomingAssignmentsQuery(limit = 20) {
  const { data: courses = [] } = useStudentCoursesQuery();

  return useQuery({
    queryKey: [...studentKeys.upcomingAssignments(), limit],
    queryFn: () => fetchStudentUpcomingAssignments(limit),
    enabled: courses.length > 0,
  });
}
