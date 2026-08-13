import type { StudentCourseListItem } from "@/api/client";
import { isUuid } from "@/api/utils";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  resolveEnrollmentSessionTimingStatus,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { resolveJoinFromMeeting } from "@/features/enrollment/enrollmentSessionTuition";
import {
  boundsFromMeetingSlots,
  resolvedAdminScheduleSessionTotal,
} from "@/features/admin/utils/adminCourseScheduleDisplay";
import { refreshScheduleAttendanceState } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import {
  resolveScheduleDayPattern,
  type ScheduleDayPattern,
} from "@/features/courses/scheduleDayPattern";
import { writePublicCourseScheduleCache } from "@/features/courses/publicCourseScheduleCache";

export type CourseScheduleSummary = {
  /** Sessions finished or currently in progress (by calendar time or attendance QR). */
  reached: number;
  /** Total planned sessions for the class. */
  total: number;
  /** 1-based meeting the student would join from (first upcoming or in progress). */
  joinFromMeeting: number;
  /** All meetings on the schedule have already finished. */
  allSessionsFinished: boolean;
  /** ISO date for first session / cohort start when known. */
  classStartDate?: string;
  /** ISO date for last session / cohort end when known. */
  classEndDate?: string;
  /** Admin Odd Day (Mon/Wed/Fri) or Even Day (Tue/Thu/Sat) pattern when known. */
  dayPattern?: ScheduleDayPattern;
};

async function buildSummary(
  slots: SessionSlotLike[],
  courseId: string,
  total: number,
  explicitDates?: { classStartDate?: string; classEndDate?: string },
): Promise<CourseScheduleSummary | null> {
  if (total <= 0) return null;
  const { heldSlotKeys, activeSlotKeys } = await refreshScheduleAttendanceState(courseId);
  const timings = slots.map((slot) =>
    resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys),
  );
  const effectiveTotal = Math.max(total, slots.length);
  const { joinFromMeeting, allSessionsFinished } = resolveJoinFromMeeting(effectiveTotal, timings);
  const reached = timings.filter((status) => status === "finished" || status === "ongoing").length;
  const slotBounds = boundsFromMeetingSlots(slots);
  const classStartDate = explicitDates?.classStartDate?.trim() || slotBounds.start;
  const classEndDate = explicitDates?.classEndDate?.trim() || slotBounds.end;
  const dayPattern = resolveScheduleDayPattern(
    courseId,
    slots.map((slot) => slot.sessionDate),
  ) ?? undefined;

  return {
    reached,
    total: effectiveTotal,
    joinFromMeeting,
    allSessionsFinished,
    classStartDate,
    classEndDate,
    dayPattern,
  };
}

export async function fetchCourseScheduleSummary(
  courseId: string,
): Promise<CourseScheduleSummary | null> {
  const id = String(courseId);

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

    writePublicCourseScheduleCache(id, slots);

    return await buildSummary(slots, id, total ?? 0, {
      classStartDate: detail.classStartDate,
      classEndDate: detail.classEndDate,
    });
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
