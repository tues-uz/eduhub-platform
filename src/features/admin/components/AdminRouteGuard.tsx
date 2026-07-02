import { type PropsWithChildren, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthSession } from "@/features/auth/context";
import {
  canAccessAdminPath,
  dashboardHomeByStaffRole,
  isAddStaffPath,
} from "@/features/admin/adminStaffRoles";

export function AdminRouteGuard({ children }: PropsWithChildren) {
  const { user } = useAuthSession();
  const location = useLocation();
  const staffRole = user.staffRole ?? "ADMIN";

  const allowed =
    user.role === "admin" &&
    canAccessAdminPath(staffRole, location.pathname) &&
    (!isAddStaffPath(location.pathname) || staffRole === "ADMIN");

  useEffect(() => {
    if (user.role === "admin" && !allowed) {
      toast.error("You don't have access to this section.");
    }
  }, [allowed, user.role]);

  if (user.role !== "admin") {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (!allowed) {
    return <Navigate to={dashboardHomeByStaffRole(staffRole)} replace />;
  }

  return children ?? <Outlet />;
}
