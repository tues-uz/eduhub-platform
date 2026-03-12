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
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { getAccessToken, eduhubEnrollments, eduhubAdmin } from "./eduhubClient";

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
    const courseId = `teacher_${c.id}`;
    const sortedLessons = [...c.lessons].sort((a, b) => a.order - b.order);
    const completedIds = lessonProgressStore.getCompletedIds(courseId);
    const totalLessons = sortedLessons.length;
    const completedCount = totalLessons ? sortedLessons.filter((l) => completedIds.includes(l.id)).length : 0;
    const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
    const status =
      progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";
    const nextLesson = sortedLessons.find((l) => !completedIds.includes(l.id))?.title ?? sortedLessons[0]?.title ?? "—";
    return {
      id: courseId,
      title: c.title,
      instructor: c.instructorName,
      progress: progressPercent,
      status,
      nextLesson,
      category: "Course",
      duration: totalLessons ? `${totalLessons} lessons` : "—",
      modules: totalLessons,
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
  getAdminOverview: async () => {
    if (getAccessToken()) {
      try {
        return await eduhubAdmin.getOverview();
      } catch (e) {
        console.error("Failed to fetch admin overview, falling back to mock data", e);
      }
    }
    return {
      stats: adminStats,
      recentUsers: adminRecentUsers,
      systemActivity: adminSystemActivity,
    };
  },
};

/** Mock course id -> lesson count (for progress calculation from lessonProgressStore) */
const MOCK_COURSE_LESSON_COUNTS: Record<number, number> = {
  1: 5,
  2: 3,
  3: 3,
  4: 2,
  5: 2,
  6: 2,
};

function enrichMockCourseProgress(course: StudentCourseListItem): StudentCourseListItem {
  const id = typeof course.id === "number" ? course.id : null;
  if (id == null || !(id in MOCK_COURSE_LESSON_COUNTS)) return course;
  const total = MOCK_COURSE_LESSON_COUNTS[id];
  const completedCount = lessonProgressStore.getCompletedIds(String(id)).length;
  const progressPercent = total ? Math.round((completedCount / total) * 100) : course.progress;
  const status =
    progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";
  return { ...course, progress: progressPercent, status };
}

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
        return [...enrolledCourses.map(enrichMockCourseProgress), ...localTeacher];
      }
    }
    return [...enrolledCourses.map(enrichMockCourseProgress), ...localTeacher];
  },
};
