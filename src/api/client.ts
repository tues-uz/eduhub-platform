import {
  studentAssignments,
  studentCourses,
  studentNotifications,
  studentRecentActivity,
  studentStats,
  enrolledCourses,
} from "@/features/student/data/dashboardData";
import {
  adminRecentUsers,
  adminStats,
  adminSystemActivity,
} from "@/features/admin/data/dashboardData";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { getAccessToken } from "./eduhubClient";
import { eduhubEnrollments } from "./eduhubClient";

/** Student course list item (id can be number for mock or string for teacher/API courses) */
export type StudentCourseListItem = {
  id: number | string;
  title: string;
  instructor: string;
  progress: number;
  status: string;
  nextLesson: string;
  category: string;
  duration: string;
  modules: number;
  enrolledDate: string;
};

function getTeacherCoursesAsStudentList(): StudentCourseListItem[] {
  const teacherCourses = teacherCoursesStore.getAll();
  return teacherCourses.map((c) => {
    const sortedLessons = [...c.lessons].sort((a, b) => a.order - b.order);
    const firstLesson = sortedLessons[0];
    return {
      id: `teacher_${c.id}`,
      title: c.title,
      instructor: c.instructorName,
      progress: 0,
      status: "In Progress",
      nextLesson: firstLesson?.title ?? "—",
      category: "Course",
      duration: c.lessons.length ? `${c.lessons.length} lessons` : "—",
      modules: c.lessons.length,
      enrolledDate: c.createdAt.slice(0, 10),
    };
  });
}

export const dashboardApi = {
  getStudentOverview: async () => ({
    stats: studentStats,
    courses: studentCourses,
    assignments: studentAssignments,
    recentActivity: studentRecentActivity,
    notifications: studentNotifications,
  }),
  getAdminOverview: async () => ({
    stats: adminStats,
    recentUsers: adminRecentUsers,
    systemActivity: adminSystemActivity,
  }),
};

export const coursesApi = {
  getStudentCourses: async (): Promise<StudentCourseListItem[]> => {
    const localTeacher = getTeacherCoursesAsStudentList();
    if (getAccessToken()) {
      try {
        const enrollments = await eduhubEnrollments.getMy();
        const apiList: StudentCourseListItem[] = enrollments.map((e) => ({
          id: e.course.id,
          title: e.course.title,
          instructor: e.course.lecturerName,
          progress: e.progress ?? 0,
          status: e.status === "COMPLETED" ? "Completed" : "In Progress",
          nextLesson: "—",
          category: e.course.category ?? "Course",
          duration: "—",
          modules: 0,
          enrolledDate: e.enrolledAt.slice(0, 10),
        }));
        return [...apiList, ...localTeacher];
      } catch {
        return [...enrolledCourses, ...localTeacher];
      }
    }
    return [...enrolledCourses, ...localTeacher];
  },
};
