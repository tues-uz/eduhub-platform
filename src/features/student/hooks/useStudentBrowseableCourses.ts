import { useQuery } from "@tanstack/react-query";
import { eduhubCourses } from "@/api/eduhubClient";
import { studentKeys } from "@/api/queryKeys";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";

export type StudentBrowseableCourse = {
  linkId: string;
  title: string;
  instructor: string;
  category: string;
  isEnrolled: boolean;
};

async function fetchBrowseableCourses(
  enrolledIds: Set<string>,
): Promise<StudentBrowseableCourse[]> {
  const apiItems: StudentBrowseableCourse[] = [];

  try {
    const published = await eduhubCourses.getAll({ page: 0, size: 100 });
    const seenIds = new Set<string>();
    published.forEach((course) => {
      if (seenIds.has(course.id)) return;
      seenIds.add(course.id);
      apiItems.push({
        linkId: course.id,
        title: course.title,
        instructor: course.lecturerName,
        category: course.category ?? "Class",
        isEnrolled: enrolledIds.has(course.id),
      });
    });
  } catch {
    // API unavailable
  }

  return apiItems;
}

export function useStudentBrowseableCourses() {
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const enrolledKey = enrolledCourses.map((course) => course.id).join(",");

  return useQuery({
    queryKey: studentKeys.browseableCourses(enrolledKey),
    queryFn: () => fetchBrowseableCourses(new Set(enrolledCourses.map((course) => String(course.id)))),
    staleTime: 60_000,
  });
}
