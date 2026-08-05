/**
 * client.ts — Application-level API layer
 *
 * This file composes raw eduhubClient calls into higher-level data structures
 * consumed by dashboard pages. It contains NO mock/fallback data.
 *
 * Error states are represented as empty arrays / null values so the UI can
 * render proper empty or loading states rather than fabricated numbers.
 */

import type { LucideIcon } from "@/lib/icons";
import { Users, GraduationCap, BookOpen, TrendingUp } from "@/lib/icons";
import { getAccessToken, eduhubAdmin, eduhubEnrollments, eduhubCompletion } from "./eduhubClient";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

/** Admin dashboard stat tile. */
export type AdminDashboardStat = {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  color: string;
  bgColor: string;
  borderColor: string;
};

/** Admin dashboard recent-users table row. */
export type AdminRecentUserRow = {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status: string;
};

/** Student course list item. */
export type StudentCourseListItem = {
  id: number | string;
  title: string;
  instructor: string;
  progress: number;
  status: string;
  nextLesson: string;
  category: string;
  duration: string;
  modules: number;
  enrolledDate: string;
  thumbnailUrl?: string;
  instructorAvatarUrl?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Admin dashboard helpers
// ──────────────────────────────────────────────────────────────────────────────

/** EMPTY stat set — shown while data loads or when the user is unauthenticated. */
const EMPTY_ADMIN_STATS: AdminDashboardStat[] = [
  { icon: Users,        label: "Total Users", value: "—", change: "", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { icon: GraduationCap, label: "Students",   value: "—", change: "", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { icon: BookOpen,     label: "Classes",     value: "—", change: "", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
];

function formatAdminUserRoleForDisplay(role: string): string {
  const u = role.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "LECTURER") return "Teacher";
  if (u === "STUDENT")  return "Student";
  if (u === "ADMIN")    return "Admin";
  if (u.startsWith("ADMIN_")) {
    const rest = u
      .slice("ADMIN_".length)
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
    return rest ? `Admin ${rest}` : "Admin";
  }
  return role;
}

function normalizeAdminRecentUserRow(raw: unknown): AdminRecentUserRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id !== undefined ? r.id : r.userId;
  if (id === undefined || id === null) return null;

  const name  = typeof r.fullName === "string" ? r.fullName : typeof r.name === "string" ? r.name : "";
  const email = typeof r.email === "string" ? r.email : "";

  let roleStr = "—";
  if (typeof r.role === "string") roleStr = formatAdminUserRoleForDisplay(r.role);

  let statusStr = "Active";
  if (typeof r.status === "string") {
    const s = r.status.toLowerCase();
    statusStr = s === "inactive" ? "Inactive" : s === "active" ? "Active" : r.status;
  } else if (typeof r.enabled === "boolean") {
    statusStr = r.enabled ? "Active" : "Inactive";
  }

  return { id: id as string | number, name: name || "—", email: email || "—", role: roleStr, status: statusStr };
}

function normalizeAdminRecentUsersArray(arr: unknown): AdminRecentUserRow[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeAdminRecentUserRow).filter((x): x is AdminRecentUserRow => x !== null);
}

function formatAdminStatInt(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

const ADMIN_STAT_ICON_BY_KEY: Record<string, LucideIcon> = {
  users: Users, user: Users, totalusers: Users,
  graduationcap: GraduationCap, students: GraduationCap, student: GraduationCap,
  bookopen: BookOpen, classes: BookOpen, courses: BookOpen, class: BookOpen,
  trendingup: TrendingUp, activity: TrendingUp, sessions: TrendingUp, activesessions: TrendingUp,
};

function resolveAdminStatIcon(raw: unknown, label: string, index: number): LucideIcon {
  if (typeof raw === "function") return raw as LucideIcon;
  if (typeof raw === "string") {
    const k = raw.replace(/\s+/g, "").toLowerCase();
    if (ADMIN_STAT_ICON_BY_KEY[k]) return ADMIN_STAT_ICON_BY_KEY[k]!;
  }
  const lb = label.toLowerCase();
  if (lb.includes("session"))                                return TrendingUp;
  if (lb.includes("class") || lb.includes("course"))        return BookOpen;
  if (lb.includes("student") && !lb.includes("total"))      return GraduationCap;
  if (lb.includes("user")   || lb.includes("total"))        return Users;
  return [Users, GraduationCap, BookOpen, TrendingUp][index % 4]!;
}

function applyLiveCountsToAdminStats(
  stats: AdminDashboardStat[],
  counts: { totalUsers?: number; students?: number; classes?: number },
): AdminDashboardStat[] {
  const next = stats.map((s) => ({ ...s }));
  const setByLabel = (re: RegExp, value: number | undefined) => {
    if (value === undefined) return;
    const idx = next.findIndex((s) => re.test(s.label));
    if (idx >= 0) next[idx] = { ...next[idx]!, value: formatAdminStatInt(value) };
  };
  setByLabel(/total\s*users/i, counts.totalUsers);
  setByLabel(/^students?$/i,   counts.students);
  setByLabel(/classes?|courses?/i, counts.classes);
  return next;
}

function buildAdminStatsFromOverview(data: Record<string, unknown>): AdminDashboardStat[] {
  // Seed from the empty template so icon/color/etc. are always set
  let stats = EMPTY_ADMIN_STATS.map((s) => ({ ...s }));
  // Apply live counts from the response
  const totalUsers    = typeof data.totalUsers    === "number" ? data.totalUsers    : undefined;
  const totalStudents = typeof data.totalStudents === "number" ? data.totalStudents : undefined;
  const totalCourses  = typeof data.totalCourses  === "number" ? data.totalCourses  : undefined;
  if (totalUsers !== undefined || totalStudents !== undefined || totalCourses !== undefined) {
    stats = applyLiveCountsToAdminStats(stats, { totalUsers, students: totalStudents, classes: totalCourses });
  }
  // If the API returned an explicit stats array, layer it on top (future-proof)
  if (Array.isArray(data.stats) && data.stats.length > 0) {
    const apiStats = data.stats as Record<string, unknown>[];
    for (let i = 0; i < apiStats.length && i < stats.length; i++) {
      const r = apiStats[i]!;
      const label = typeof r.label === "string" ? r.label : stats[i]!.label;
      stats[i] = {
        ...stats[i]!,
        icon: resolveAdminStatIcon(r.icon, label, i),
        label,
        value: r.value !== undefined
          ? (typeof r.value === "number" ? formatAdminStatInt(r.value) : String(r.value))
          : stats[i]!.value,
        change: typeof r.change === "string" ? r.change : stats[i]!.change,
        trend:  r.trend === "down" ? "down" : "up",
      };
    }
  }
  return stats;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dashboard API
// ──────────────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  /**
   * Fetches live student overview data.
   * Returns zeroed/empty values when not authenticated; no mock data.
   */
  getStudentOverview: async () => {
    const emptyResult = {
      stats: [
        { icon: BookOpen,      label: "Classes enrolled", value: "0", color: "text-blue-500",   bgColor: "bg-blue-50",   href: "/dashboard/courses" },
        { icon: GraduationCap, label: "Certificates",     value: "0", color: "text-orange-500", bgColor: "bg-orange-50", href: "/dashboard/certificates" },
        { icon: TrendingUp,    label: "Progress",         value: "0%",color: "text-green-500",  bgColor: "bg-green-50",  href: "/dashboard/progress" },
      ] as const,
      recentActivity: [] as { type: "completed" | "certificate" | "enrolled"; text: string; time: string }[],
    };

    if (!getAccessToken()) return emptyResult;

    try {
      const [courses, certificates] = await Promise.all([
        coursesApi.getStudentCourses(),
        eduhubCompletion.myCertificates().catch(() => []),
      ]);

      const courseCount = courses.length;
      const avgProgress = courseCount
        ? Math.round(courses.reduce((sum, c) => sum + (c.progress ?? 0), 0) / courseCount)
        : 0;

      const recentActivity: typeof emptyResult.recentActivity = [
        ...courses.map((c) => ({ type: "enrolled" as const, text: `Enrolled in: ${c.title}`, time: c.enrolledDate })),
        ...certificates.map((cert) => ({ type: "certificate" as const, text: `Earned certificate: ${cert.courseTitle}`, time: cert.issuedAt })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 6);

      return {
        stats: [
          { icon: BookOpen,      label: "Classes enrolled", value: String(courseCount),  color: "text-blue-500",   bgColor: "bg-blue-50",   href: "/dashboard/courses" },
          { icon: GraduationCap, label: "Certificates",     value: String(certificates.length), color: "text-orange-500", bgColor: "bg-orange-50", href: "/dashboard/certificates" },
          { icon: TrendingUp,    label: "Progress",         value: `${avgProgress}%`,    color: "text-green-500",  bgColor: "bg-green-50",  href: "/dashboard/progress" },
        ] as const,
        recentActivity,
      };
    } catch {
      // API error — return empty state, not fabricated data
      return emptyResult;
    }
  },

  /**
   * Fetches live admin overview data.
   * Returns empty values on API error — no hardcoded fallback statistics.
   */
  getAdminOverview: async () => {
    const emptyResult = {
      stats: EMPTY_ADMIN_STATS.map((s) => ({ ...s })),
      recentUsers: [] as AdminRecentUserRow[],
      systemActivity: [] as { action: string; detail: string; time: string }[],
    };

    if (!getAccessToken()) return emptyResult;

    try {
      const raw = await eduhubAdmin.getOverview();
      if (!raw || typeof raw !== "object") return emptyResult;
      const d = raw as Record<string, unknown>;

      return {
        stats: buildAdminStatsFromOverview(d),
        recentUsers: normalizeAdminRecentUsersArray(d.recentUsers),
        systemActivity: Array.isArray(d.systemActivity)
          ? (d.systemActivity as { action: string; detail: string; time: string }[])
          : [],
      };
    } catch {
      // API error — return empty state, not fabricated data
      return emptyResult;
    }
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Courses API
// ──────────────────────────────────────────────────────────────────────────────

export const coursesApi = {
  /**
   * Returns the authenticated user's enrolled courses from the API.
   * Returns an empty array when unauthenticated or on error.
   */
  getStudentCourses: async (): Promise<StudentCourseListItem[]> => {
    if (!getAccessToken()) return [];

    try {
      const enrollments = await eduhubEnrollments.getMy();
      return enrollments.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        instructor: e.course.lecturerName,
        instructorAvatarUrl: e.course.lecturerAvatarUrl?.trim() || undefined,
        progress: e.progress ?? 0,
        status: e.status === "COMPLETED" ? "Completed" : "In Progress",
        nextLesson: "—",
        category: e.course.category ?? "Class",
        duration: "—",
        modules: 0,
        enrolledDate: e.enrolledAt.slice(0, 10),
        thumbnailUrl: e.course.thumbnailUrl?.trim() || undefined,
      }));
    } catch {
      return [];
    }
  },
};
