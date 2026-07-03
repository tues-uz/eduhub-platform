import { Navigate } from "react-router-dom";
import StudentDashboardPage from "@/features/student/pages/StudentDashboardPage";
import { useAuthSession } from "@/features/auth/context";
import { dashboardHomeByRole } from "@/app/routes";
import { appRoutes } from "@/app/routes";

/**
 * At /dashboard: redirect admin/teacher to their dashboards; show StudentDashboard for students.
 */
const DashboardRedirect = () => {
  const { user } = useAuthSession();
  if (user.role === "admin") return <Navigate to={dashboardHomeByRole("admin", user.staffRole)} replace />;
  if (user.role === "teacher") return <Navigate to={appRoutes.dashboardTeacher} replace />;
  return <StudentDashboardPage />;
};

export default DashboardRedirect;
