import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UserRole } from "@/features/auth/types";
import {
  adminMenuItems,
  studentMenuItems,
  teacherMenuItems,
  translateMenuItems,
  type TranslatedMenuItem,
} from "@/features/layout/navigation";

export function useDashboardMenuItems(role: UserRole): TranslatedMenuItem[] | null {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    if (role === "teacher") return translateMenuItems(teacherMenuItems, t);
    if (role === "admin") return translateMenuItems(adminMenuItems, t);
    if (role === "student") return translateMenuItems(studentMenuItems, t);
    return null;
  }, [role, t, i18n.language]);
}
