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
  getStudentCourses: async () => enrolledCourses,
};
