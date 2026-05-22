import type { ScheduleProposalResponse } from "@/api/eduhubTypes";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import {
  padMeetingSlotsForCourse,
  parseOptionalPositiveInt,
  resolveClassScheduleFormState,
} from "@/features/teacher/pages/teacherCourseFormHelpers";
import type { ApprovedScheduleSlotOption } from "@/features/teacher/components/AttendanceOverviewQrPicker";

export function formatClassMeetingSlotLabel(slot: ClassMeetingSlot, index: number): string {
  const title = slot.title?.trim() || `Session ${index + 1}`;
  const date = slot.sessionDate?.trim();
  const time = slot.sessionTime?.trim();
  const tail = [date, time].filter(Boolean).join(" ");
  return tail ? `${title} · ${tail}` : title;
}

type ScheduleSourceCourse = {
  classMeetingSlots?: ClassMeetingSlot[];
  classMeetingsInSixMonths?: number;
};

/** Approved / published meeting rows for attendance QR and enrollment (same order as roster schedule tab). */
export function buildCourseScheduleSlots(
  course: ScheduleSourceCourse,
  proposal: ScheduleProposalResponse | null | undefined,
  courseId: string,
): ClassMeetingSlot[] {
  if (proposal?.sessions?.length) {
    const rawSlots = proposal.sessions.map((s) => ({
      title: s.title ?? "",
      sessionDate: s.sessionDate ?? "",
      sessionTime: s.sessionTime ?? "",
    }));
    const n = Math.max(proposal.sessionCount, rawSlots.length);
    return padMeetingSlotsForCourse(n, rawSlots);
  }

  const resolved = resolveClassScheduleFormState(course, courseId);
  const fromStr = parseOptionalPositiveInt(resolved.meetingsSixMonthsStr);
  const fromCourse = typeof course.classMeetingsInSixMonths === "number" ? course.classMeetingsInSixMonths : 0;
  const n = Math.max(fromStr ?? 0, fromCourse, resolved.slots.length);
  return padMeetingSlotsForCourse(n, resolved.slots);
}

export function toApprovedScheduleSlotOptions(slots: ClassMeetingSlot[]): ApprovedScheduleSlotOption[] {
  return slots
    .map((slot, index) => ({
      index,
      label: formatClassMeetingSlotLabel(slot, index),
      sessionDate: slot.sessionDate?.trim() || undefined,
      sessionTime: slot.sessionTime?.trim() || undefined,
      title: slot.title?.trim() || undefined,
    }))
    .filter((s) => s.label.trim().length > 0);
}
