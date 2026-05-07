import {
  studentAssignments,
  studentCourses,
  studentNotifications,
  studentRecentActivity,
  studentStats,
  enrolledCourses,
} from "@/features/student/data/dashboardData";
import {
  adminRecentUsers,
  adminStats,
  adminSystemActivity,
} from "@/features/admin/data/dashboardData";
import type { LucideIcon } from "lucide-react";
import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { getAccessToken, eduhubEnrollments, eduhubAdmin, eduhubCourses } from "./eduhubClient";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";

/** Admin dashboard stat row — `icon` must be a component (JSON APIs send strings; we resolve those below). */
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

/** Recent Users table row — matches admin dashboard + normalized `/admin/users` payloads. */
export type AdminRecentUserRow = {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status: string;
};

function formatAdminUserRoleForDisplay(role: string): string {
  const u = role.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "LECTURER") return "Teacher";
  if (u === "STUDENT") return "Student";
  if (u === "ADMIN") return "Admin";
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

function mapApiUserToAdminRecentUser(u: Record<string, unknown>): AdminRecentUserRow | null {
  const id = u.id;
  if (id === undefined || id === null) return null;
  const fullName = typeof u.fullName === "string" ? u.fullName : "";
  const email = typeof u.email === "string" ? u.email : "";
  const roleRaw = typeof u.role === "string" ? formatAdminUserRoleForDisplay(u.role) : "—";
  const status =
    typeof u.enabled === "boolean" ? (u.enabled ? "Active" : "Inactive") : "Active";
  return {
    id: id as string | number,
    name: fullName || "—",
    email: email || "—",
    role: roleRaw,
    status,
  };
}

function normalizeAdminRecentUserRow(raw: unknown): AdminRecentUserRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id !== undefined ? r.id : r.userId;
  if (id === undefined || id === null) return null;

  const name =
    typeof r.name === "string"
      ? r.name
      : typeof r.fullName === "string"
        ? r.fullName
        : "";
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

  return {
    id: id as string | number,
    name: name || "—",
    email: email || "—",
    role: roleStr,
    status: statusStr,
  };
}

function normalizeAdminRecentUsersArray(arr: unknown): AdminRecentUserRow[] {
  if (!Array.isArray(arr)) return [];
  const out: AdminRecentUserRow[] = [];
  for (const row of arr) {
    const n = normalizeAdminRecentUserRow(row);
    if (n) out.push(n);
  }
  return out;
}

function formatAdminStatInt(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

const ADMIN_STAT_ICON_BY_KEY: Record<string, LucideIcon> = {
  users: Users,
  user: Users,
  totalusers: Users,
  graduationcap: GraduationCap,
  students: GraduationCap,
  student: GraduationCap,
  bookopen: BookOpen,
  classes: BookOpen,
  courses: BookOpen,
  class: BookOpen,
  trendingup: TrendingUp,
  activity: TrendingUp,
  sessions: TrendingUp,
  activesessions: TrendingUp,
};

function resolveAdminStatIcon(raw: unknown, label: string, index: number): LucideIcon {
  if (typeof raw === "function") return raw as LucideIcon;
  if (typeof raw === "string") {
    const k = raw.replace(/\s+/g, "").toLowerCase();
    if (ADMIN_STAT_ICON_BY_KEY[k]) return ADMIN_STAT_ICON_BY_KEY[k];
  }
  const lb = label.toLowerCase();
  if (lb.includes("session")) return TrendingUp;
  if (lb.includes("class") || lb.includes("course")) return BookOpen;
  if (lb.includes("student") && !lb.includes("total")) return GraduationCap;
  if (lb.includes("user") || lb.includes("total")) return Users;
  return [Users, GraduationCap, BookOpen, TrendingUp][index % 4];
}

function stringifyAdminStatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return formatAdminStatInt(v);
  return String(v);
}

function normalizeAdminTrend(t: unknown): "up" | "down" {
  if (t === "down" || t === "DOWN") return "down";
  return "up";
}

function cloneDefaultAdminStats(): AdminDashboardStat[] {
  return adminStats.map((s) => ({ ...s })) as AdminDashboardStat[];
}

function normalizeAdminStatRow(raw: unknown, index: number, fallback: AdminDashboardStat): AdminDashboardStat {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === "string" ? r.label : fallback.label;
  return {
    icon: resolveAdminStatIcon(r.icon, label, index),
    label,
    value: r.value !== undefined ? stringifyAdminStatValue(r.value) : fallback.value,
    change: typeof r.change === "string" ? r.change : fallback.change,
    trend: normalizeAdminTrend(r.trend),
    color: typeof r.color === "string" ? r.color : fallback.color,
    bgColor: typeof r.bgColor === "string" ? r.bgColor : fallback.bgColor,
    borderColor: typeof r.borderColor === "string" ? r.borderColor : fallback.borderColor,
  };
}

function normalizeAdminStatsArray(apiStats: unknown): AdminDashboardStat[] {
  const defaults = cloneDefaultAdminStats();
  if (!Array.isArray(apiStats) || apiStats.length === 0) return defaults;
  const normalized = apiStats.map((row, i) =>
    normalizeAdminStatRow(row, i, defaults[Math.min(i, defaults.length - 1)]!),
  );
  if (normalized.length >= defaults.length) return normalized;
  const padded = [...normalized];
  for (let i = padded.length; i < defaults.length; i++) padded.push(defaults[i]!);
  return padded;
}

function normalizeAdminOverviewPayload(data: unknown): {
  stats: AdminDashboardStat[];
  recentUsers: AdminRecentUserRow[];
  systemActivity: typeof adminSystemActivity;
} {
  if (!data || typeof data !== "object") {
    return {
      stats: cloneDefaultAdminStats(),
      recentUsers: normalizeAdminRecentUsersArray(adminRecentUsers),
      systemActivity: adminSystemActivity,
    };
  }
  const d = data as Record<string, unknown>;
  const recentUsers =
    Array.isArray(d.recentUsers) && d.recentUsers.length > 0
      ? normalizeAdminRecentUsersArray(d.recentUsers)
      : [];
  return {
    stats: normalizeAdminStatsArray(d.stats),
    recentUsers,
    systemActivity:
      Array.isArray(d.systemActivity) && d.systemActivity.length > 0
        ? (d.systemActivity as typeof adminSystemActivity)
        : adminSystemActivity,
  };
}

function readPageTotalElements(page: unknown): number | undefined {
  if (!page || typeof page !== "object") return undefined;
  const n = (page as { totalElements?: unknown }).totalElements;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/** Prefer label-based match so API order can differ from the default four cards. */
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
  setByLabel(/^students?$/i, counts.students);
  setByLabel(/classes?|courses?/i, counts.classes);
  return next;
}

async function enrichAdminOverviewWithLiveCounts(base: {
  stats: AdminDashboardStat[];
  recentUsers: AdminRecentUserRow[];
  systemActivity: typeof adminSystemActivity;
}) {
  try {
    const [usersPage, studentsPage, courses] = await Promise.all([
      eduhubAdmin.listUsers({ page: 0, size: 25 }),
      eduhubAdmin.listUsers({ role: "STUDENT", page: 0, size: 1 }),
      eduhubCourses.getAll({ page: 0, size: 500 }),
    ]);
    const totalUsers = readPageTotalElements(usersPage);
    const students = readPageTotalElements(studentsPage);
    const classes = Array.isArray(courses) ? courses.length : undefined;

    const recentFromList: AdminRecentUserRow[] = [];
    const content = usersPage && typeof usersPage === "object" ? (usersPage as { content?: unknown }).content : undefined;
    if (Array.isArray(content)) {
      for (const row of content) {
        if (!row || typeof row !== "object") continue;
        const mapped = mapApiUserToAdminRecentUser(row as Record<string, unknown>);
        if (mapped) recentFromList.push(mapped);
      }
    }

    return {
      ...base,
      stats: applyLiveCountsToAdminStats(base.stats, { totalUsers, students, classes }),
      recentUsers: recentFromList.length > 0 ? recentFromList : base.recentUsers,
    };
  } catch {
    return base;
  }
}

/** Student course list item (id can be number for mock or string for teacher/API courses) */
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
};

function normalizeStoredStudentEmail(): string | null {
  if (typeof window === "undefined") return null;
  const e = localStorage.getItem("userEmail");
  return e?.trim().toLowerCase() ?? null;
}

function getTeacherCoursesAsStudentList(): StudentCourseListItem[] {
  const teacherCourses = teacherCoursesStore.getAll();
  return teacherCourses.map((c) => {
    const courseId = `teacher_${c.id}`;
    const sortedLessons = [...c.lessons].sort((a, b) => a.order - b.order);
    const completedIds = lessonProgressStore.getCompletedIds(courseId);
    const totalLessons = sortedLessons.length;
    const completedCount = totalLessons ? sortedLessons.filter((l) => completedIds.includes(l.id)).length : 0;
    const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
    const status =
      progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";
    const nextLesson = sortedLessons.find((l) => !completedIds.includes(l.id))?.title ?? sortedLessons[0]?.title ?? "—";
    return {
      id: courseId,
      title: c.title,
      instructor: c.instructorName,
      progress: progressPercent,
      status,
      nextLesson,
      category: "Class",
      duration: totalLessons ? `${totalLessons} lessons` : "—",
      modules: totalLessons,
      enrolledDate: c.createdAt.slice(0, 10),
    };
  });
}

export const dashboardApi = {
  getStudentOverview: async () => ({
    stats: studentStats,
    courses: studentCourses,
    assignments: studentAssignments,
    recentActivity: studentRecentActivity,
    notifications: studentNotifications,
  }),
  getAdminOverview: async () => {
    const fallback = {
      stats: cloneDefaultAdminStats(),
      recentUsers: normalizeAdminRecentUsersArray(adminRecentUsers),
      systemActivity: adminSystemActivity,
    };
    if (!getAccessToken()) return fallback;

    try {
      const raw = await eduhubAdmin.getOverview();
      const normalized = normalizeAdminOverviewPayload(raw);
      return await enrichAdminOverviewWithLiveCounts(normalized);
    } catch (e) {
      console.error("Failed to fetch admin overview, falling back to mock data", e);
      return fallback;
    }
  },
};

/** Mock course id -> lesson count (for progress calculation from lessonProgressStore) */
const MOCK_COURSE_LESSON_COUNTS: Record<number, number> = {
  1: 5,
  2: 3,
  3: 3,
  4: 2,
  5: 2,
  6: 2,
};

function enrichMockCourseProgress(course: StudentCourseListItem): StudentCourseListItem {
  const id = typeof course.id === "number" ? course.id : null;
  if (id == null || !(id in MOCK_COURSE_LESSON_COUNTS)) return course;
  const total = MOCK_COURSE_LESSON_COUNTS[id];
  const completedCount = lessonProgressStore.getCompletedIds(String(id)).length;
  const progressPercent = total ? Math.round((completedCount / total) * 100) : course.progress;
  const status =
    progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";
  return { ...course, progress: progressPercent, status };
}

export const coursesApi = {
  getStudentCourses: async (): Promise<StudentCourseListItem[]> => {
    const emailNorm = normalizeStoredStudentEmail();
    const allTeacher = getTeacherCoursesAsStudentList();
    const localTeacher =
      emailNorm != null
        ? allTeacher.filter((item) =>
            enrollmentApplicationStore.isApprovedForCourse(String(item.id), emailNorm),
          )
        : allTeacher;
    if (getAccessToken()) {
      try {
        const enrollments = await eduhubEnrollments.getMy();
        const apiList: StudentCourseListItem[] = enrollments.map((e) => ({
          id: e.course.id,
          title: e.course.title,
          instructor: e.course.lecturerName,
          progress: e.progress ?? 0,
          status: e.status === "COMPLETED" ? "Completed" : "In Progress",
          nextLesson: "—",
          category: e.course.category ?? "Class",
          duration: "—",
          modules: 0,
          enrolledDate: e.enrolledAt.slice(0, 10),
        }));
        // If the backend doesn't support admin approval yet, we still show locally-approved API courses
        // so the student can access the class UI immediately.
        const apiIds = new Set(apiList.map((c) => String(c.id)));
        const localApprovedApi: StudentCourseListItem[] =
          emailNorm != null
            ? enrollmentApplicationStore
                .list()
                .filter(
                  (r) =>
                    r.applicantEmailNorm === emailNorm &&
                    r.status === "APPROVED" &&
                    !String(r.courseId).startsWith("teacher_") &&
                    !apiIds.has(String(r.courseId)),
                )
                .map((r) => ({
                  id: r.courseId,
                  title: r.courseTitle ?? r.courseId,
                  instructor: "—",
                  progress: 0,
                  status: "Enrolled",
                  nextLesson: "—",
                  category: "Class",
                  duration: "—",
                  modules: 0,
                  enrolledDate: (r.reviewedAt ?? r.submittedAt).slice(0, 10),
                }))
            : [];

        return [...apiList, ...localApprovedApi, ...localTeacher];
      } catch {
        return [...enrolledCourses.map(enrichMockCourseProgress), ...localTeacher];
      }
    }
    return [...enrolledCourses.map(enrichMockCourseProgress), ...localTeacher];
  },
};
