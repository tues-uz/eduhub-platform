import { useQuery } from "@tanstack/react-query";
import { eduhubCourses, eduhubLecturer, eduhubPayroll } from "@/api/eduhubClient";
import type { TeacherCourse } from "@/features/teacher/types";

export const teacherKeys = {
  all: ["teacher"] as const,
  courses: (lecturerId: string) => [...teacherKeys.all, "courses", lecturerId] as const,
  stats: () => [...teacherKeys.all, "stats"] as const,
  payrollClasses: (lecturerId: string) => [...teacherKeys.all, "payroll-classes", lecturerId] as const,
};

function mapApiCourse(c: Awaited<ReturnType<typeof eduhubCourses.getByLecturer>>[number]): TeacherCourse {
  const unit = c.pricing?.discountedAmount ?? c.pricing?.amount;
  return {
    id: c.id,
    title: c.title,
    description: "",
    instructorName: c.lecturerName,
    thumbnailUrl: c.thumbnailUrl,
    enrollmentCount: c.enrollmentCount,
    lessons: [],
    createdAt: c.createdAt,
    updatedAt: c.createdAt,
    status: c.status,
    ...(unit != null && unit > 0
      ? { price: unit, priceCurrency: c.pricing?.currency }
      : {}),
  };
}

export function useTeacherCoursesQuery(lecturerId: string | undefined) {
  return useQuery({
    queryKey: teacherKeys.courses(lecturerId ?? ""),
    queryFn: async () => {
      const res = await eduhubCourses.getByLecturer(lecturerId!, { page: 0, size: 100 });
      return (res || []).map(mapApiCourse);
    },
    enabled: !!lecturerId,
  });
}

export function useTeacherStatsQuery() {
  return useQuery({
    queryKey: teacherKeys.stats(),
    queryFn: () => eduhubLecturer.getStats(),
  });
}

/** Lecturer's own + approved-substitute-covered classes, with real tuition/collection figures. */
export function usePayrollClassesQuery(lecturerId: string | undefined) {
  return useQuery({
    queryKey: teacherKeys.payrollClasses(lecturerId ?? ""),
    queryFn: () => eduhubPayroll.getClasses(),
    enabled: !!lecturerId,
  });
}
