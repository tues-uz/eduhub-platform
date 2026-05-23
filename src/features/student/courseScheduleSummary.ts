import type { StudentCourseListItem } from "@/api/client";
import { isUuid } from "@/api/utils";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  resolveEnrollmentSessionTimingStatus,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { resolvedAdminScheduleSessionTotal } from "@/features/admin/utils/adminCourseScheduleDisplay";
import { getScheduleAttendanceState } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

const TEACHER_PREFIX = "teacher_";

export type CourseScheduleSummary = {
  /** Sessions finished or currently in progress (by calendar time or attendance QR). */
  reached: number;
  /** Total planned sessions for the class. */
  total: number;
};

function countReachedSessions(slots: SessionSlotLike[], courseId: string): number {
  const { heldSlotKeys, activeSlotKeys } = getScheduleAttendanceState(courseId);
  return slots.filter((slot) => {
    const status = resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys);
    return status === "finished" || status === "ongoing";
  }).length;
}

function buildSummary(slots: SessionSlotLike[], courseId: string, total: number): CourseScheduleSummary | null {
  if (total <= 0) return null;
  return {
    reached: countReachedSessions(slots, courseId),
    total: Math.max(total, slots.length),
  };
}

export async function fetchCourseScheduleSummary(
  courseId: string,
): Promise<CourseScheduleSummary | null> {
  const id = String(courseId);

  if (id.startsWith(TEACHER_PREFIX)) {
    const teacherCourse = teacherCoursesStore.getById(id.slice(TEACHER_PREFIX.length));
    if (!teacherCourse) return null;

    const slots = buildCourseScheduleSlots(teacherCourse, null, id);
    return buildSummary(slots, id, slots.length);
  }

  if (!isUuid(id)) return null;

  try {
    const [detail, proposal] = await Promise.all([
      eduhubCourses.getById(id),
      eduhubSchedule.getProposal(id).catch(() => null),
    ]);
    const slots = buildCourseScheduleSlots(detail, proposal, id);
    const total =
      resolvedAdminScheduleSessionTotal(id, detail, proposal) ??
      (proposal?.sessionCount && proposal.sessionCount > 0 ? proposal.sessionCount : undefined) ??
      slots.length;

    return buildSummary(slots, id, total ?? 0);
  } catch {
    return null;
  }
}

export async function fetchCourseScheduleSummaries(
  courses: StudentCourseListItem[],
): Promise<Map<string, CourseScheduleSummary>> {
  const entries = await Promise.all(
    courses.map(async (course) => {
      const summary = await fetchCourseScheduleSummary(String(course.id));
      return [String(course.id), summary] as const;
    }),
  );

  const map = new Map<string, CourseScheduleSummary>();
  for (const [courseId, summary] of entries) {
    if (summary) map.set(courseId, summary);
  }
  return map;
}
