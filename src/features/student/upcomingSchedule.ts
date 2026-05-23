import type { StudentCourseListItem } from "@/api/client";
import { isUuid } from "@/api/utils";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import {
  formatClassDateLabel,
  formatSessionTimeLabel,
  orderSessionSlotsChronologically,
  resolvePreviewSessionSlots,
  resolveSessionTimingStatus,
  sessionStartMs,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

const TEACHER_PREFIX = "teacher_";

export type UpcomingScheduleItem = {
  courseId: string;
  courseTitle: string;
  instructor: string;
  instructorAvatarUrl?: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  startMs: number;
  timingStatus: "upcoming" | "ongoing";
};

async function fetchSessionSlotsForCourse(course: StudentCourseListItem): Promise<SessionSlotLike[]> {
  const id = String(course.id);

  if (id.startsWith(TEACHER_PREFIX)) {
    const teacherCourseId = id.slice(TEACHER_PREFIX.length);
    const tc = teacherCoursesStore.getById(teacherCourseId);
    return resolvePreviewSessionSlots(id, null, null, false, tc);
  }

  if (isUuid(id)) {
    try {
      const [detail, proposal] = await Promise.all([
        eduhubCourses.getById(id),
        eduhubSchedule.getProposal(id).catch(() => null),
      ]);
      return resolvePreviewSessionSlots(id, detail, proposal, true, null);
    } catch {
      return [];
    }
  }

  return [];
}

export async function fetchStudentUpcomingSchedule(
  courses: StudentCourseListItem[],
  limit = 5,
): Promise<UpcomingScheduleItem[]> {
  const now = Date.now();
  const items: UpcomingScheduleItem[] = [];

  await Promise.all(
    courses.map(async (course) => {
      const slots = orderSessionSlotsChronologically(await fetchSessionSlotsForCourse(course));
      for (const slot of slots) {
        const timingStatus = resolveSessionTimingStatus(slot, now);
        if (timingStatus !== "upcoming" && timingStatus !== "ongoing") continue;

        const startMs = sessionStartMs(slot.sessionDate, slot.sessionTime);
        items.push({
          courseId: String(course.id),
          courseTitle: course.title,
          instructor: course.instructor,
          instructorAvatarUrl: course.instructorAvatarUrl,
          sessionTitle: slot.title?.trim() || course.title,
          sessionDate: slot.sessionDate,
          sessionTime: slot.sessionTime,
          startMs: startMs ?? Infinity,
          timingStatus,
        });
      }
    }),
  );

  items.sort((a, b) => {
    if (a.timingStatus === "ongoing" && b.timingStatus !== "ongoing") return -1;
    if (b.timingStatus === "ongoing" && a.timingStatus !== "ongoing") return 1;
    return a.startMs - b.startMs;
  });

  return items.slice(0, limit);
}

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Compact label for dashboard rows: Today, Tomorrow, or formatted date. */
export function formatUpcomingScheduleDayLabel(sessionDate: string): string {
  const ms = sessionStartMs(sessionDate);
  if (ms == null) return "Date TBA";

  const dayDiff = Math.round((startOfLocalDayMs(new Date(ms)) - startOfLocalDayMs(new Date())) / 86_400_000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return formatClassDateLabel(sessionDate) ?? "Date TBA";
}

export function formatUpcomingScheduleWhen(sessionDate: string, sessionTime: string): string {
  const day = formatUpcomingScheduleDayLabel(sessionDate);
  const time = formatSessionTimeLabel(sessionTime);
  return time ? `${day} · ${time}` : day;
}

/** Human-readable countdown until session start (null when already started or unknown). */
export function formatScheduleCountdown(
  sessionDate: string,
  sessionTime: string,
  nowMs: number = Date.now(),
): string | null {
  const start = sessionStartMs(sessionDate, sessionTime);
  if (start == null) return null;

  const diff = start - nowMs;
  if (diff <= 0) return null;

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Starts in less than a minute";
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (hours < 24) return `Starts in ${hours} hr${hours === 1 ? "" : "s"}`;
  if (days < 7) return `Starts in ${days} day${days === 1 ? "" : "s"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Starts in ${weeks} week${weeks === 1 ? "" : "s"}`;
  return `Starts in ${days} days`;
}
