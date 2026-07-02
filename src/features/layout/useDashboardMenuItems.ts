import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UserRole } from "@/features/auth/types";
import type { AdminStaffRole } from "@/features/admin/adminStaffRoles";
import { getAdminMenuItems } from "@/features/admin/adminStaffRoles";
import {
  studentMenuItems,
  teacherMenuItems,
  translateMenuItems,
  type TranslatedMenuItem,
} from "@/features/layout/navigation";
import { useAuthSession } from "@/features/auth/context";

export function useDashboardMenuItems(role: UserRole): TranslatedMenuItem[] | null {
  const { t, i18n } = useTranslation();
  const { user } = useAuthSession();

  return useMemo(() => {
    if (role === "teacher") return translateMenuItems(teacherMenuItems, t);
    if (role === "admin") {
      const staffRole: AdminStaffRole = user.staffRole ?? "ADMIN";
      return translateMenuItems(getAdminMenuItems(staffRole), t);
    }
    if (role === "student") return translateMenuItems(studentMenuItems, t);
    return null;
  }, [role, user.staffRole, t, i18n.language]);
}
