import type { UserRole } from "@/features/auth/types";
import {
  adminMenuItems,
  type FlatMenuItem,
  type NestedMenuItem,
} from "@/features/layout/navigation";
import { appRoutes } from "@/app/routes";

/** API role strings sent to POST /admin/users and returned from auth. */
export type AdminStaffRole =
  | "ADMIN"
  | "ADMIN_FINANCE"
  | "ADMIN_CONTENT"
  | "ADMIN_SUPPORT"
  | "ADMIN_ANALYTIC";

export type StaffRoleSlug =
  | "teacher"
  | "admin-finance"
  | "admin-content"
  | "admin-support"
  | "admin-analytic";

export type StaffRoleConfig = {
  slug: StaffRoleSlug;
  apiRole: string;
  isTeacher: boolean;
  requiresAdminCode: boolean;
  titleKey: string;
  descriptionKey: string;
};

/** Roles accepted by POST /api/v1/admin/users. */
export const API_SUPPORTED_CREATE_USER_ROLES = new Set([
  "ADMIN",
  "ADMIN_FINANCE",
  "ADMIN_CONTENT",
  "ADMIN_SUPPORT",
  "ADMIN_ANALYTIC",
  "LECTURER",
  "STUDENT",
]);

export function isApiCreateUserRoleSupported(apiRole: string): boolean {
  return API_SUPPORTED_CREATE_USER_ROLES.has(apiRole.trim().toUpperCase());
}


export const ADMIN_FINANCE_HOME = "/dashboard/admin/finance";
export const ADMIN_CONTENT_HOME = "/dashboard/admin/content";
export const ADMIN_ANALYTIC_HOME = "/dashboard/admin/analytic";

export const STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  {
    slug: "teacher",
    apiRole: "LECTURER",
    isTeacher: true,
    requiresAdminCode: false,
    titleKey: "admin.addUserRole.roles.teacher",
    descriptionKey: "admin.addUserRole.descriptions.teacher",
  },
  {
    slug: "admin-finance",
    apiRole: "ADMIN_FINANCE",
    isTeacher: false,
    requiresAdminCode: true,
    titleKey: "admin.addUserRole.roles.adminFinance",
    descriptionKey: "admin.addUserRole.descriptions.adminFinance",
  },
  {
    slug: "admin-content",
    apiRole: "ADMIN_CONTENT",
    isTeacher: false,
    requiresAdminCode: true,
    titleKey: "admin.addUserRole.roles.adminContent",
    descriptionKey: "admin.addUserRole.descriptions.adminContent",
  },
  {
    slug: "admin-support",
    apiRole: "ADMIN_SUPPORT",
    isTeacher: false,
    requiresAdminCode: true,
    titleKey: "admin.addUserRole.roles.adminSupport",
    descriptionKey: "admin.addUserRole.descriptions.adminSupport",
  },
  {
    slug: "admin-analytic",
    apiRole: "ADMIN_ANALYTIC",
    isTeacher: false,
    requiresAdminCode: true,
    titleKey: "admin.addUserRole.roles.adminAnalytic",
    descriptionKey: "admin.addUserRole.descriptions.adminAnalytic",
  },
];

export function staffRoleConfigBySlug(slug: string): StaffRoleConfig | undefined {
  return STAFF_ROLE_CONFIGS.find((c) => c.slug === slug);
}

function normalizeApiRole(apiRole: string): string {
  return apiRole.trim().toUpperCase().replace(/\s+/g, "_");
}

export function isAdminApiRole(apiRole: string): boolean {
  const r = normalizeApiRole(apiRole);
  return r === "ADMIN" || r.startsWith("ADMIN_");
}

export function mapApiRoleToStaffRole(apiRole: string): AdminStaffRole | undefined {
  const r = normalizeApiRole(apiRole);
  if (r === "ADMIN") return "ADMIN";
  if (r === "ADMIN_FINANCE") return "ADMIN_FINANCE";
  if (r === "ADMIN_CONTENT") return "ADMIN_CONTENT";
  if (r === "ADMIN_SUPPORT") return "ADMIN_SUPPORT";
  if (r === "ADMIN_ANALYTIC") return "ADMIN_ANALYTIC";
  return undefined;
}

export function mapApiRoleToSession(apiRole: string): { appRole: UserRole; staffRole?: AdminStaffRole } {
  const r = normalizeApiRole(apiRole);
  if (r === "LECTURER") return { appRole: "teacher" };
  const staffRole = mapApiRoleToStaffRole(r);
  if (staffRole) return { appRole: "admin", staffRole };
  return { appRole: "student" };
}

export function dashboardHomeByStaffRole(staffRole?: AdminStaffRole): string {
  if (staffRole === "ADMIN_FINANCE") return ADMIN_FINANCE_HOME;
  if (staffRole === "ADMIN_CONTENT") return ADMIN_CONTENT_HOME;
  if (staffRole === "ADMIN_ANALYTIC") return ADMIN_ANALYTIC_HOME;
  return appRoutes.dashboardAdmin;
}

const FINANCE_PATHS = new Set([
  ADMIN_FINANCE_HOME,
  "/dashboard/admin/notifications",
  "/dashboard/admin/enrollment-applications",
  "/dashboard/admin/payments",
  "/dashboard/admin/installment-payments",
  "/dashboard/admin/payroll",
  "/dashboard/admin/payroll/proof",
  "/dashboard/admin/transactions",
]);

const CONTENT_PATHS = new Set([
  ADMIN_CONTENT_HOME,
  "/dashboard/admin/notifications",
  "/dashboard/admin/landing-page",
  "/dashboard/admin/courses",
  "/dashboard/admin/promos",
  "/dashboard/admin/referral-codes",
  "/dashboard/admin/special-tuition",
]);

const SUPPORT_PATHS = new Set([
  "/dashboard/admin",
  "/dashboard/admin/notifications",
  "/dashboard/admin/students",
  "/dashboard/admin/support-sessions",
  "/dashboard/admin/substitute-requests",
  "/dashboard/admin/calendar",
]);

const ANALYTIC_PATHS = new Set([
  ADMIN_ANALYTIC_HOME,
  "/dashboard/admin/reports",
  "/dashboard/admin/attendance",
  "/dashboard/admin/transactions",
]);

function pathAllowedForStaffRole(staffRole: AdminStaffRole, pathname: string): boolean {
  if (staffRole === "ADMIN") return pathname.startsWith("/dashboard/admin");

  const normalized = pathname.replace(/\/+$/, "") || pathname;

  if (staffRole === "ADMIN_FINANCE") {
    if (normalized === appRoutes.dashboardAdmin) return false;
    if (FINANCE_PATHS.has(normalized)) return true;
    if (normalized.startsWith("/dashboard/admin/enrollment-applications/")) return true;
    if (normalized.startsWith("/dashboard/admin/payroll/")) return true;
    return false;
  }

  if (staffRole === "ADMIN_CONTENT") {
    if (normalized === appRoutes.dashboardAdmin) return false;
    if (CONTENT_PATHS.has(normalized)) return true;
    if (normalized.startsWith("/dashboard/admin/courses/")) return true;
    return false;
  }

  if (staffRole === "ADMIN_SUPPORT") {
    if (SUPPORT_PATHS.has(normalized)) return true;
    if (normalized.startsWith("/dashboard/admin/substitute-requests/")) return true;
    return false;
  }

  if (staffRole === "ADMIN_ANALYTIC") {
    if (normalized === appRoutes.dashboardAdmin) return false;
    return ANALYTIC_PATHS.has(normalized);
  }

  return false;
}

export function canAccessAdminPath(staffRole: AdminStaffRole | undefined, pathname: string): boolean {
  const role = staffRole ?? "ADMIN";
  if (role === "ADMIN") {
    if (pathname === ADMIN_FINANCE_HOME || pathname.startsWith(`${ADMIN_FINANCE_HOME}/`)) {
      return true;
    }
    if (pathname === ADMIN_CONTENT_HOME || pathname.startsWith(`${ADMIN_CONTENT_HOME}/`)) {
      return true;
    }
    if (pathname === ADMIN_ANALYTIC_HOME || pathname.startsWith(`${ADMIN_ANALYTIC_HOME}/`)) {
      return true;
    }
    return pathname.startsWith("/dashboard/admin");
  }
  return pathAllowedForStaffRole(role, pathname);
}

function filterMenuPaths(
  items: Array<FlatMenuItem | NestedMenuItem>,
  allowedPaths: Set<string>,
  dashboardPath: string,
): Array<FlatMenuItem | NestedMenuItem> {
  const result: Array<FlatMenuItem | NestedMenuItem> = [];

  for (const item of items) {
    if ("path" in item) {
      const path = item.path === appRoutes.dashboardAdmin ? dashboardPath : item.path;
      if (allowedPaths.has(path) || [...allowedPaths].some((p) => path.startsWith(`${p}/`))) {
        result.push(path === item.path ? item : { ...item, path });
      }
      continue;
    }

    const children = item.children.filter((child) => allowedPaths.has(child.path));
    if (children.length > 0) {
      result.push({ ...item, children });
    }
  }

  return result;
}

function superAdminMenuItems(): Array<FlatMenuItem | NestedMenuItem> {
  return adminMenuItems.map((item) => {
    if (!("children" in item) || item.labelKey !== "adminNav.people") return item;
    const children = item.children.filter((c) => c.path !== "/dashboard/admin/add-user-role");
    return {
      ...item,
      children: [
        ...children,
        { labelKey: "adminNav.addStaff", path: "/dashboard/admin/add-user" },
      ],
    };
  });
}

export function getAdminMenuItems(staffRole?: AdminStaffRole): Array<FlatMenuItem | NestedMenuItem> {
  const role = staffRole ?? "ADMIN";
  if (role === "ADMIN") return superAdminMenuItems();

  if (role === "ADMIN_FINANCE") {
    return filterMenuPaths(adminMenuItems, FINANCE_PATHS, ADMIN_FINANCE_HOME);
  }

  if (role === "ADMIN_CONTENT") {
    return filterMenuPaths(adminMenuItems, CONTENT_PATHS, ADMIN_CONTENT_HOME);
  }

  if (role === "ADMIN_SUPPORT") {
    return filterMenuPaths(adminMenuItems, SUPPORT_PATHS, appRoutes.dashboardAdmin);
  }

  if (role === "ADMIN_ANALYTIC") {
    return filterMenuPaths(adminMenuItems, ANALYTIC_PATHS, ADMIN_ANALYTIC_HOME);
  }

  return adminMenuItems;
}

export function isAddStaffPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/admin/add-user" ||
    pathname.startsWith("/dashboard/admin/add-user/") ||
    pathname === "/dashboard/admin/add-user-role"
  );
}
