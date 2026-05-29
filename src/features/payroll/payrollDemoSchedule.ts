import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import {
  PAYROLL_SUBMIT_DEMO_SCHEDULE_KEY,
  PAYROLL_SUBMIT_DEMO_SLOTS,
} from "@/features/payroll/payrollSubmitDemo";

export function payrollClassScheduleKey(classSection: string, course: string): string {
  return `${classSection.trim()}\t${course.trim()}`;
}

/** Demo schedules aligned with mock payroll rows when API / local course data is missing. */
const DEMO_PAYROLL_CLASS_SCHEDULES: Record<string, SessionSlotLike[]> = {
  [PAYROLL_SUBMIT_DEMO_SCHEDULE_KEY]: PAYROLL_SUBMIT_DEMO_SLOTS,
  [payrollClassScheduleKey("BE-B2 Lunch cohort", "Business English B2")]: [
    { title: "Speaking & fluency", sessionDate: "2026-03-03", sessionTime: "12:00" },
    { title: "Business writing", sessionDate: "2026-03-10", sessionTime: "12:00" },
    { title: "Email etiquette", sessionDate: "2026-03-17", sessionTime: "12:00" },
    { title: "Meetings language", sessionDate: "2026-03-24", sessionTime: "12:00" },
    { title: "Negotiations intro", sessionDate: "2026-04-07", sessionTime: "12:00" },
    { title: "Presentations", sessionDate: "2026-04-14", sessionTime: "12:00" },
    { title: "Case study workshop", sessionDate: "2026-04-21", sessionTime: "12:00" },
    { title: "Mid-term review", sessionDate: "2026-04-28", sessionTime: "12:00" },
    { title: "Advanced negotiations", sessionDate: "2026-05-05", sessionTime: "12:00" },
    { title: "Client calls role-play", sessionDate: "2026-05-12", sessionTime: "12:00" },
    { title: "Report writing", sessionDate: "2026-05-19", sessionTime: "12:00" },
    { title: "Final review & assessment", sessionDate: "2026-05-26", sessionTime: "12:00" },
  ],
  [payrollClassScheduleKey("BE-B2 Mon/Wed", "Business English B2")]: [
    { title: "Speaking lab", sessionDate: "2026-03-02", sessionTime: "18:00" },
    { title: "Writing clinic", sessionDate: "2026-03-04", sessionTime: "18:00" },
    { title: "Listening practice", sessionDate: "2026-03-09", sessionTime: "18:00" },
    { title: "Grammar in context", sessionDate: "2026-03-11", sessionTime: "18:00" },
    { title: "Business vocabulary", sessionDate: "2026-03-16", sessionTime: "18:00" },
    { title: "Role-play meetings", sessionDate: "2026-03-18", sessionTime: "18:00" },
    { title: "Email workshop", sessionDate: "2026-03-23", sessionTime: "18:00" },
    { title: "Presentation skills", sessionDate: "2026-03-25", sessionTime: "18:00" },
    { title: "Negotiation basics", sessionDate: "2026-04-06", sessionTime: "18:00" },
    { title: "Case study", sessionDate: "2026-04-08", sessionTime: "18:00" },
    { title: "Mock interview", sessionDate: "2026-04-13", sessionTime: "18:00" },
    { title: "Course wrap-up", sessionDate: "2026-04-15", sessionTime: "18:00" },
  ],
};

export function getDemoPayrollScheduleSlots(classSection: string, course: string): SessionSlotLike[] | null {
  const exact = DEMO_PAYROLL_CLASS_SCHEDULES[payrollClassScheduleKey(classSection, course)];
  if (exact?.length) return exact;

  const courseOnly = course.trim();
  const byCourse = Object.entries(DEMO_PAYROLL_CLASS_SCHEDULES).find(([key]) => key.endsWith(`\t${courseOnly}`));
  return byCourse?.[1]?.length ? byCourse[1] : null;
}

export function hasDemoPayrollSchedule(classSection: string, course: string): boolean {
  return getDemoPayrollScheduleSlots(classSection, course) != null;
}
