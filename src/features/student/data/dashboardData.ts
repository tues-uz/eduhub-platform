import {
  Award,
  BookOpen,
  TrendingUp,
} from "@/lib/icons";

/**
 * Student dashboard stat tiles.
 *
 * These are the STRUCTURAL definitions (icon, label, href, color) only.
 * The `value` field is always overwritten by live API data from
 * {@link import("@/api/client").dashboardApi.getStudentOverview}.
 *
 * Hardcoded course data and lesson-count maps have been removed.
 * All enrolled-course data comes from the backend enrollment API.
 */
export const studentStats = [
  {
    icon: BookOpen,
    label: "Classes enrolled",
    value: "0",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    href: "/dashboard/courses",
  },
  {
    icon: Award,
    label: "Certificates",
    value: "0",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    href: "/dashboard/certificates",
  },
  {
    icon: TrendingUp,
    label: "Progress",
    value: "0%",
    color: "text-green-500",
    bgColor: "bg-green-50",
    href: "/dashboard/progress",
  },
] as const;

/**
 * Pre-auth/offline fallback — empty until real activity loads from the API.
 * The dashboardApi replaces this with live data once authenticated.
 */
export const studentRecentActivity: { type: "completed" | "certificate" | "enrolled"; text: string; time: string }[] = [];
