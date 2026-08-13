import { Navigate, Route, Routes } from "react-router-dom";
import StudentDashboardLayout from "@/layouts/StudentDashboardLayout";
import TeacherDashboardLayout from "@/layouts/TeacherDashboardLayout";
import EduHub from "@/pages/EduHub";
import EduHubAboutPage from "@/pages/EduHubAboutPage";
import EduHubProgramPage from "@/pages/EduHubProgramPage";
import EduHubBlogArticlePage from "@/pages/EduHubBlogArticlePage";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";
import ChangePassword from "@/pages/ChangePassword";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import DashboardRedirect from "@/pages/DashboardRedirect";
import StudentCoursesPage from "@/features/student/pages/StudentCoursesPage";
import StudentAvailableCourses from "@/pages/StudentAvailableCourses";
import StudentAvailableCourseDetailPage from "@/pages/StudentAvailableCourseDetailPage";
import PublicAvailableClassDetailPage from "@/pages/PublicAvailableClassDetailPage";
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
import StudentPaymentInfo from "@/pages/StudentPaymentInfo";
import StudentInstallmentPaymentPage from "@/pages/StudentInstallmentPaymentPage";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import AdminFinanceDashboardPage from "@/features/admin/pages/AdminFinanceDashboardPage";
import AdminAnalyticDashboardPage from "@/features/admin/pages/AdminAnalyticDashboardPage";
import AdminNotificationsPage from "@/features/admin/pages/AdminNotificationsPage";
import AdminSubstituteCoverRequestsPage from "@/features/admin/pages/AdminSubstituteCoverRequestsPage";
import AdminSubstituteInviteDetailPage from "@/features/admin/pages/AdminSubstituteInviteDetailPage";
import AdminStudentsPage from "@/features/admin/pages/AdminStudentsPage";
import AdminEnrollmentApplicationsPage from "@/features/admin/pages/AdminEnrollmentApplicationsPage";
import AdminEnrollmentApplicationDetailPage from "@/features/admin/pages/AdminEnrollmentApplicationDetailPage";
import AdminClassesPage from "@/features/admin/pages/AdminClassesPage";
import AdminAttendancePage from "@/features/admin/pages/AdminAttendancePage";
import AdminPaymentsPage from "@/features/admin/pages/AdminPaymentsPage";
import AdminInstallmentPaymentsPage from "@/features/admin/pages/AdminInstallmentPaymentsPage";
import AdminPayrollPage from "@/features/admin/pages/AdminPayrollPage";
import AdminPayrollProofPage from "@/features/admin/pages/AdminPayrollProofPage";
import AdminInstructorPayrollRequestDetailPage from "@/features/admin/pages/AdminInstructorPayrollRequestDetailPage";
import AdminPlacementTestsPage from "@/features/admin/pages/AdminPlacementTestsPage";
import AdminCertificationsPage from "@/features/admin/pages/AdminCertificationsPage";
import AdminCalendarPage from "@/features/admin/pages/AdminCalendarPage";
import AdminSupportSessionsPage from "@/features/admin/pages/AdminSupportSessionsPage";
import AdminTeacherComplaintsPage from "@/features/admin/pages/AdminTeacherComplaintsPage";
import AdminIntegrationsPage from "@/features/admin/pages/AdminIntegrationsPage";
import AdminCoursesListPage from "@/features/admin/pages/AdminCoursesListPage";
import AdminCourseDetailPage from "@/features/admin/pages/AdminCourseDetailPage";
import AdminCourseSchedulePage from "@/features/admin/pages/AdminCourseSchedulePage";
import AdminTeachersPage from "@/features/admin/pages/AdminTeachersPage";
import AdminStaffPage from "@/features/admin/pages/AdminStaffPage";
import AdminUsersPage from "@/features/admin/pages/AdminUsersPage";
import AdminAddStaffHubPage from "@/features/admin/pages/AdminAddStaffHubPage";
import AdminAddStaffUserPage from "@/features/admin/pages/AdminAddStaffUserPage";
import AdminContentHubPage from "@/features/admin/pages/AdminContentHubPage";
import AdminLandingPagePage from "@/features/admin/pages/AdminLandingPagePage";
import AdminTransactionsPage from "@/features/admin/pages/AdminTransactionsPage";
import AdminReportsPage from "@/features/admin/pages/AdminReportsPage";
import AdminSettingsPage from "@/features/admin/pages/AdminSettingsPage";
import AdminPromosPage from "@/features/admin/pages/AdminPromosPage";
import AdminReferralCodesPage from "@/features/admin/pages/AdminReferralCodesPage";
import AdminSpecialTuitionPage from "@/features/admin/pages/AdminSpecialTuitionPage";
import { AdminRouteGuard } from "@/features/admin/components/AdminRouteGuard";
import AdminLayout from "@/features/admin/components/AdminLayout";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherCoursesPage from "@/features/teacher/pages/TeacherCoursesPage";
import TeacherCourseFormLayout from "@/features/teacher/pages/TeacherCourseFormLayout";
import TeacherCourseFormDetailsPage from "@/features/teacher/pages/TeacherCourseFormDetailsPage";
import TeacherCourseFormSchedulePage from "@/features/teacher/pages/TeacherCourseFormSchedulePage";
import TeacherCourseFormLessonsPage from "@/features/teacher/pages/TeacherCourseFormLessonsPage";
import TeacherCourseRosterPage from "@/features/teacher/pages/TeacherCourseRosterPage";
import TeacherCourseResumeEditPage from "@/features/teacher/pages/TeacherCourseResumeEditPage";
import TeacherQuizPage from "@/features/teacher/pages/TeacherQuizPage";
import TeacherQuizResultsPage from "@/features/teacher/pages/TeacherQuizResultsPage";
import TeacherStudentsPage from "@/features/teacher/pages/TeacherStudentsPage";
import TeacherAssignmentsPage from "@/features/teacher/pages/TeacherAssignmentsPage";
import TeacherAttendanceQrPage from "@/features/teacher/pages/TeacherAttendanceQrPage";
import TeacherPayrollPage from "@/features/teacher/pages/TeacherPayrollPage";
import TeacherSettingsPage from "@/features/teacher/pages/TeacherSettingsPage";
import TeacherNotifications from "@/pages/TeacherNotifications";
import TeacherSubstituteInviteReviewPage from "@/features/teacher/pages/TeacherSubstituteInviteReviewPage";
import TeacherScheduleApprovalsPage from "@/features/teacher/pages/TeacherScheduleApprovalsPage";
import NotFound from "@/pages/NotFound";
import StudentAttendanceJoin from "@/pages/StudentAttendanceJoin";
import StudentEnrollmentApplicationPage from "@/pages/StudentEnrollmentApplicationPage";
import StudentEnrollmentSuccessPage from "@/pages/StudentEnrollmentSuccessPage";
import StudentCourseCompletionPage from "@/pages/StudentCourseCompletionPage";
import StudentCourseResumePage from "@/pages/StudentCourseResumePage";
import { appRoutes } from "@/app/routes";
import { AuthRouteGuard } from "@/features/auth/components/AuthRouteGuard";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<EduHub />} />
      <Route path="/eduhub" element={<Navigate to={appRoutes.home} replace />} />
      <Route path={appRoutes.about} element={<EduHubAboutPage />} />
      <Route
        path={appRoutes.programsLanguageTraining}
        element={<EduHubProgramPage variant="languageTraining" />}
      />
      <Route
        path={appRoutes.programsAcademicServices}
        element={<EduHubProgramPage variant="academicServices" />}
      />
      <Route path="/blog/:slug" element={<EduHubBlogArticlePage />} />
      <Route path="/classes/:courseId" element={<PublicAvailableClassDetailPage />} />
      <Route path={appRoutes.signIn} element={<SignIn />} />
      <Route path={appRoutes.register} element={<SignUp />} />
      <Route path={appRoutes.changePassword} element={<ChangePassword />} />
      <Route path={appRoutes.forgotPassword} element={<ForgotPassword />} />
      <Route path={appRoutes.resetPassword} element={<ResetPassword />} />
      <Route path={appRoutes.verifyEmail} element={<VerifyEmail />} />
      <Route path="/verifyemail" element={<VerifyEmail />} />

      <Route path={appRoutes.dashboard} element={<DashboardRedirect />} />

      <Route element={<AdminRouteGuard />}>
        <Route element={<AdminLayout />}>
          <Route path={appRoutes.dashboardAdmin} element={<AdminDashboardPage />} />
          <Route path={appRoutes.dashboardAdminFinance} element={<AdminFinanceDashboardPage />} />
          <Route path={appRoutes.dashboardAdminAnalytic} element={<AdminAnalyticDashboardPage />} />
          <Route path="/dashboard/admin/notifications" element={<AdminNotificationsPage />} />
          <Route path="/dashboard/admin/substitute-requests" element={<AdminSubstituteCoverRequestsPage />} />
          <Route path="/dashboard/admin/substitute-requests/:inviteId" element={<AdminSubstituteInviteDetailPage />} />
          <Route path="/dashboard/admin/students" element={<AdminStudentsPage />} />
          <Route
            path="/dashboard/admin/enrollments"
            element={<Navigate to="/dashboard/admin/enrollment-applications" replace />}
          />
          <Route
            path="/dashboard/admin/enrollment-applications/:applicationId"
            element={<AdminEnrollmentApplicationDetailPage />}
          />
          <Route path="/dashboard/admin/enrollment-applications" element={<AdminEnrollmentApplicationsPage />} />
          <Route path="/dashboard/admin/classes" element={<AdminClassesPage />} />
          <Route path="/dashboard/admin/attendance" element={<AdminAttendancePage />} />
          <Route path="/dashboard/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/dashboard/admin/installment-payments" element={<AdminInstallmentPaymentsPage />} />
          <Route path="/dashboard/admin/payroll" element={<AdminPayrollPage />} />
          <Route path="/dashboard/admin/payroll/instructor-request/:requestId" element={<AdminInstructorPayrollRequestDetailPage />} />
          <Route
            path="/dashboard/admin/payroll/instructor-requests"
            element={<Navigate to="/dashboard/admin/payroll?tab=requests" replace />}
          />
          <Route path="/dashboard/admin/payroll/proof" element={<AdminPayrollProofPage />} />
          <Route
            path="/dashboard/admin/payroll/submissions"
            element={<Navigate to="/dashboard/admin/payroll?tab=proof" replace />}
          />
          <Route path="/dashboard/admin/placement-tests" element={<AdminPlacementTestsPage />} />
          <Route path="/dashboard/admin/certifications" element={<AdminCertificationsPage />} />
          <Route path="/dashboard/admin/calendar" element={<AdminCalendarPage />} />
          <Route path="/dashboard/admin/support-sessions" element={<AdminSupportSessionsPage />} />
          <Route path="/dashboard/admin/teacher-complaints" element={<AdminTeacherComplaintsPage />} />
          <Route path="/dashboard/admin/integrations" element={<AdminIntegrationsPage />} />
          <Route path="/dashboard/admin/teachers" element={<AdminTeachersPage />} />
          <Route path="/dashboard/admin/staff" element={<AdminStaffPage />} />
          <Route path="/dashboard/admin/courses" element={<AdminCoursesListPage />} />
          <Route path="/dashboard/admin/courses/:courseId/schedule" element={<AdminCourseSchedulePage />} />
          <Route path="/dashboard/admin/courses/:courseId" element={<AdminCourseDetailPage />} />
          <Route path="/dashboard/admin/add-user" element={<AdminAddStaffHubPage />} />
          <Route path="/dashboard/admin/add-user/:roleSlug" element={<AdminAddStaffUserPage />} />
          <Route path="/dashboard/admin/add-user-role" element={<Navigate to="/dashboard/admin/add-user" replace />} />
          <Route path="/dashboard/admin/content" element={<AdminContentHubPage />} />
          <Route path="/dashboard/admin/landing-page" element={<AdminLandingPagePage />} />
          <Route path="/dashboard/admin/transactions" element={<AdminTransactionsPage />} />
          <Route path="/dashboard/admin/reports" element={<AdminReportsPage />} />
          <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
          <Route path="/dashboard/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/dashboard/admin/promos" element={<AdminPromosPage />} />
          <Route path="/dashboard/admin/referral-codes" element={<AdminReferralCodesPage />} />
          <Route path="/dashboard/admin/special-tuition" element={<AdminSpecialTuitionPage />} />
        </Route>
      </Route>

      {/* ── Teacher routes (requires any valid auth token) ─────────────────── */}
      <Route element={<AuthRouteGuard />}>
        <Route element={<TeacherDashboardLayout />}>
        <Route path={appRoutes.dashboardTeacher} element={<TeacherDashboard />} />
        <Route path="/dashboard/teacher/courses" element={<TeacherCoursesPage />} />
        <Route path="/dashboard/teacher/courses/new" element={<TeacherCourseFormLayout />}>
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<TeacherCourseFormDetailsPage />} />
          <Route path="schedule" element={<TeacherCourseFormSchedulePage />} />
          <Route path="lessons" element={<TeacherCourseFormLessonsPage />} />
        </Route>
        <Route path="/dashboard/teacher/courses/:courseId/edit" element={<TeacherCourseFormLayout />}>
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<TeacherCourseFormDetailsPage />} />
          <Route path="schedule" element={<TeacherCourseFormSchedulePage />} />
          <Route path="lessons" element={<TeacherCourseFormLessonsPage />} />
        </Route>
        {/** Static `new` must be its own path so it always wins over `:courseId`-only routes in the matcher. */}
        <Route
          path="/dashboard/teacher/courses/:courseId/resume/new"
          element={<TeacherCourseResumeEditPage />}
        />
        <Route
          path="/dashboard/teacher/courses/:courseId/resume/:resumeId"
          element={<TeacherCourseResumeEditPage />}
        />
        <Route path="/dashboard/teacher/courses/:courseId" element={<TeacherCourseRosterPage />} />
        <Route path="/dashboard/teacher/placement-test" element={<TeacherQuizPage />} />
        <Route path="/dashboard/teacher/placement-test/:courseId/:quizId/results" element={<TeacherQuizResultsPage />} />
        <Route path="/dashboard/teacher/placement-test/:courseId/:moduleId/:lessonId/results" element={<TeacherQuizResultsPage />} />
        <Route path="/dashboard/teacher/assignments" element={<TeacherAssignmentsPage />} />
        <Route path="/dashboard/teacher/students" element={<TeacherStudentsPage />} />
        <Route path="/dashboard/teacher/attendance" element={<TeacherAttendanceQrPage />} />
        <Route path="/dashboard/teacher/schedule" element={<TeacherScheduleApprovalsPage />} />
        <Route path="/dashboard/teacher/notifications" element={<TeacherNotifications />} />
        <Route path="/dashboard/teacher/substitute-requests/:inviteId" element={<TeacherSubstituteInviteReviewPage />} />
        <Route path="/dashboard/teacher/payroll" element={<TeacherPayrollPage />} />
        <Route path="/dashboard/teacher/payroll/submissions" element={<Navigate to="/dashboard/teacher/payroll" replace />} />
        <Route path="/dashboard/teacher/settings" element={<TeacherSettingsPage />} />
        </Route>
      </Route>

      <Route path="/dashboard/available-courses/enroll/:courseId/success" element={<StudentEnrollmentSuccessPage />} />
      <Route path="/dashboard/available-courses/enroll/:courseId" element={<StudentEnrollmentApplicationPage />} />

      {/* Full-page congrats (not inside dashboard sidebar shell) */}
      <Route path="/dashboard/congrats-preview" element={<StudentCourseCompletionPage />} />
      <Route path="/dashboard/courses/:courseId/congrats" element={<StudentCourseCompletionPage />} />

      {/* ── Student routes (requires any valid auth token) ───────────────── */}
      <Route element={<AuthRouteGuard />}>
        <Route element={<StudentDashboardLayout />}>
        <Route path="/dashboard/courses" element={<StudentCoursesPage />} />
        <Route path="/dashboard/available-courses" element={<StudentAvailableCourses />} />
        <Route path="/dashboard/available-courses/class/:courseId" element={<StudentAvailableCourseDetailPage />} />
        <Route path="/dashboard/payment" element={<StudentPaymentInfo />} />
        <Route path="/dashboard/payment/remaining/:applicationId" element={<StudentInstallmentPaymentPage />} />
        <Route path="/dashboard/courses/:courseId" element={<StudentCourseDetail />} />
        <Route path="/dashboard/courses/:courseId/resume/:resumeId" element={<StudentCourseResumePage />} />
        <Route path="/dashboard/courses/:courseId/lessons/:lessonId" element={<StudentLessonPage />} />
        <Route path="/dashboard/assignments" element={<StudentAssignments />} />
        <Route path="/dashboard/certificates" element={<StudentCertificates />} />
        <Route path="/dashboard/progress" element={<StudentProgress />} />
        <Route path="/dashboard/schedule" element={<StudentSchedule />} />
        <Route path="/dashboard/settings" element={<StudentSettings />} />
        <Route path="/dashboard/notifications" element={<StudentNotifications />} />
        <Route path="/dashboard/quiz" element={<StudentQuiz />} />
        <Route path="/dashboard/placement-tests" element={<StudentPlacementTests />} />
        <Route path="/dashboard/attendance/join" element={<StudentAttendanceJoin />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
