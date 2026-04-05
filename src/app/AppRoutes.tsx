import { Route, Routes } from "react-router-dom";
import EduHub from "@/pages/EduHub";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";
import ChangePassword from "@/pages/ChangePassword";
import DashboardRedirect from "@/pages/DashboardRedirect";
import StudentCoursesPage from "@/features/student/pages/StudentCoursesPage";
import StudentAvailableCourses from "@/pages/StudentAvailableCourses";
import StudentCourseDetail from "@/pages/StudentCourseDetail";
import StudentLessonPage from "@/pages/StudentLessonPage";
import StudentAssignments from "@/pages/StudentAssignments";
import StudentCertificates from "@/pages/StudentCertificates";
import StudentProgress from "@/pages/StudentProgress";
import StudentSchedule from "@/pages/StudentSchedule";
import StudentSettings from "@/pages/StudentSettings";
import StudentNotifications from "@/pages/StudentNotifications";
import StudentQuiz from "@/pages/StudentQuiz";
import StudentPlacementTests from "@/pages/StudentPlacementTests";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import AdminStudentsPage from "@/features/admin/pages/AdminStudentsPage";
import AdminEnrollmentsPage from "@/features/admin/pages/AdminEnrollmentsPage";
import AdminClassesPage from "@/features/admin/pages/AdminClassesPage";
import AdminAttendancePage from "@/features/admin/pages/AdminAttendancePage";
import AdminPaymentsPage from "@/features/admin/pages/AdminPaymentsPage";
import AdminPlacementTestsPage from "@/features/admin/pages/AdminPlacementTestsPage";
import AdminCertificationsPage from "@/features/admin/pages/AdminCertificationsPage";
import AdminCalendarPage from "@/features/admin/pages/AdminCalendarPage";
import AdminSupportSessionsPage from "@/features/admin/pages/AdminSupportSessionsPage";
import AdminIntegrationsPage from "@/features/admin/pages/AdminIntegrationsPage";
import AdminCoursesListPage from "@/features/admin/pages/AdminCoursesListPage";
import AdminTeachersPage from "@/features/admin/pages/AdminTeachersPage";
import AdminStaffPage from "@/features/admin/pages/AdminStaffPage";
import AdminUsersPage from "@/features/admin/pages/AdminUsersPage";
import AdminAddUserRolePage from "@/features/admin/pages/AdminAddUserRolePage";
import AdminTransactionsPage from "@/features/admin/pages/AdminTransactionsPage";
import AdminReportsPage from "@/features/admin/pages/AdminReportsPage";
import AdminSettingsPage from "@/features/admin/pages/AdminSettingsPage";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherPlaceholder from "@/pages/TeacherPlaceholder";
import TeacherCoursesPage from "@/features/teacher/pages/TeacherCoursesPage";
import TeacherCourseFormPage from "@/features/teacher/pages/TeacherCourseFormPage";
import TeacherQuizPage from "@/features/teacher/pages/TeacherQuizPage";
import TeacherQuizResultsPage from "@/features/teacher/pages/TeacherQuizResultsPage";
import TeacherStudentsPage from "@/features/teacher/pages/TeacherStudentsPage";
import TeacherAssignmentsPage from "@/features/teacher/pages/TeacherAssignmentsPage";
import NotFound from "@/pages/NotFound";
import { appRoutes } from "@/app/routes";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<EduHub />} />
      <Route path={appRoutes.signIn} element={<SignIn />} />
      <Route path={appRoutes.register} element={<SignUp />} />
      <Route path={appRoutes.changePassword} element={<ChangePassword />} />
      <Route path={appRoutes.verifyEmail} element={<VerifyEmail />} />
      <Route path="/verifyemail" element={<VerifyEmail />} />

      <Route path={appRoutes.dashboard} element={<DashboardRedirect />} />

      <Route path={appRoutes.dashboardAdmin} element={<AdminDashboardPage />} />
      <Route path="/dashboard/admin/students" element={<AdminStudentsPage />} />
      <Route path="/dashboard/admin/enrollments" element={<AdminEnrollmentsPage />} />
      <Route path="/dashboard/admin/classes" element={<AdminClassesPage />} />
      <Route path="/dashboard/admin/attendance" element={<AdminAttendancePage />} />
      <Route path="/dashboard/admin/payments" element={<AdminPaymentsPage />} />
      <Route path="/dashboard/admin/placement-tests" element={<AdminPlacementTestsPage />} />
      <Route path="/dashboard/admin/certifications" element={<AdminCertificationsPage />} />
      <Route path="/dashboard/admin/calendar" element={<AdminCalendarPage />} />
      <Route path="/dashboard/admin/support-sessions" element={<AdminSupportSessionsPage />} />
      <Route path="/dashboard/admin/integrations" element={<AdminIntegrationsPage />} />
      <Route path="/dashboard/admin/teachers" element={<AdminTeachersPage />} />
      <Route path="/dashboard/admin/staff" element={<AdminStaffPage />} />
      <Route path="/dashboard/admin/courses" element={<AdminCoursesListPage />} />
      <Route path="/dashboard/admin/add-user-role" element={<AdminAddUserRolePage />} />
      <Route path="/dashboard/admin/transactions" element={<AdminTransactionsPage />} />
      <Route path="/dashboard/admin/reports" element={<AdminReportsPage />} />
      <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
      <Route path="/dashboard/admin/settings" element={<AdminSettingsPage />} />

      <Route path={appRoutes.dashboardTeacher} element={<TeacherDashboard />} />
      <Route path="/dashboard/teacher/courses" element={<TeacherCoursesPage />} />
      <Route path="/dashboard/teacher/courses/new" element={<TeacherCourseFormPage />} />
      <Route path="/dashboard/teacher/courses/:courseId/edit" element={<TeacherCourseFormPage />} />
      <Route path="/dashboard/teacher/placement-test" element={<TeacherQuizPage />} />
      <Route path="/dashboard/teacher/placement-test/:courseId/:quizId/results" element={<TeacherQuizResultsPage />} />
      <Route path="/dashboard/teacher/placement-test/:courseId/:moduleId/:lessonId/results" element={<TeacherQuizResultsPage />} />
      <Route path="/dashboard/teacher/assignments" element={<TeacherAssignmentsPage />} />
      <Route path="/dashboard/teacher/students" element={<TeacherStudentsPage />} />
      <Route path="/dashboard/teacher/schedule" element={<TeacherPlaceholder />} />
      <Route path="/dashboard/teacher/settings" element={<TeacherPlaceholder />} />

      <Route path="/dashboard/courses" element={<StudentCoursesPage />} />
      <Route path="/dashboard/available-courses" element={<StudentAvailableCourses />} />
      <Route path="/dashboard/courses/:courseId" element={<StudentCourseDetail />} />
      <Route path="/dashboard/courses/:courseId/lessons/:lessonId" element={<StudentLessonPage />} />
      <Route path="/dashboard/assignments" element={<StudentAssignments />} />
      <Route path="/dashboard/certificates" element={<StudentCertificates />} />
      <Route path="/dashboard/progress" element={<StudentProgress />} />
      <Route path="/dashboard/schedule" element={<StudentSchedule />} />
      <Route path="/dashboard/settings" element={<StudentSettings />} />
      <Route path="/dashboard/notifications" element={<StudentNotifications />} />
      <Route path="/dashboard/quiz" element={<StudentQuiz />} />
      <Route path="/dashboard/placement-tests" element={<StudentPlacementTests />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
