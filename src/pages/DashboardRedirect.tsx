import { Navigate } from "react-router-dom";
import StudentDashboard from "./StudentDashboard";

/**
 * At /dashboard: redirect admin/teacher to their dashboards; show StudentDashboard for students.
 */
const DashboardRedirect = () => {
  const role = localStorage.getItem("userRole");
  if (role === "admin") return <Navigate to="/dashboard/admin" replace />;
  if (role === "teacher") return <Navigate to="/dashboard/teacher" replace />;
  return <StudentDashboard />;
};

export default DashboardRedirect;
