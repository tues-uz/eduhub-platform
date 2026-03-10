import { Route, Routes } from "react-router-dom";
import EduHub from "@/pages/EduHub";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";
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
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import AdminPlaceholder from "@/pages/AdminPlaceholder";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherPlaceholder from "@/pages/TeacherPlaceholder";
import TeacherCoursesPage from "@/features/teacher/pages/TeacherCoursesPage";
import TeacherCourseFormPage from "@/features/teacher/pages/TeacherCourseFormPage";
import TeacherQuizPage from "@/features/teacher/pages/TeacherQuizPage";
import TeacherQuizResultsPage from "@/features/teacher/pages/TeacherQuizResultsPage";
import TeacherStudentsPage from "@/features/teacher/pages/TeacherStudentsPage";
import NotFound from "@/pages/NotFound";
import { appRoutes } from "@/app/routes";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<EduHub />} />
      <Route path={appRoutes.signIn} element={<SignIn />} />
      <Route path={appRoutes.register} element={<SignUp />} />
      <Route path={appRoutes.verifyEmail} element={<VerifyEmail />} />
      <Route path="/verifyemail" element={<VerifyEmail />} />

      <Route path={appRoutes.dashboard} element={<DashboardRedirect />} />

      <Route path={appRoutes.dashboardAdmin} element={<AdminDashboardPage />} />
      <Route path="/dashboard/admin/students" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/teachers" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/staff" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/courses" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/add-user-role" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/transactions" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/reports" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/users" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/analytics" element={<AdminPlaceholder />} />
      <Route path="/dashboard/admin/settings" element={<AdminPlaceholder />} />

      <Route path={appRoutes.dashboardTeacher} element={<TeacherDashboard />} />
      <Route path="/dashboard/teacher/courses" element={<TeacherCoursesPage />} />
      <Route path="/dashboard/teacher/courses/new" element={<TeacherCourseFormPage />} />
      <Route path="/dashboard/teacher/courses/:courseId/edit" element={<TeacherCourseFormPage />} />
      <Route path="/dashboard/teacher/placement-test" element={<TeacherQuizPage />} />
      <Route path="/dashboard/teacher/placement-test/:quizId/results" element={<TeacherQuizResultsPage />} />
      <Route path="/dashboard/teacher/assignments" element={<TeacherPlaceholder />} />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
