import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import {
  markScheduleSlotHeld,
  scheduleSlotKeyFromParts,
} from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import type { TeacherCourse } from "@/features/teacher/types";

export const PAYROLL_SUBMIT_DEMO_COURSE_ID = "payroll-submit-demo";
export const PAYROLL_SUBMIT_DEMO_TITLE = "Payroll Submit Demo";
export const PAYROLL_SUBMIT_DEMO_PRICE_PER_STUDENT = 1_000_000;
export const PAYROLL_SUBMIT_DEMO_PRICE_CURRENCY = "UZS";

/** Link id used by payroll schedule + attendance (`teacher_${localId}`). */
export const PAYROLL_SUBMIT_DEMO_LINK_ID = `teacher_${PAYROLL_SUBMIT_DEMO_COURSE_ID}`;

export const PAYROLL_SUBMIT_DEMO_DATA_VERSION = 5;
const PAYROLL_SUBMIT_DEMO_VERSION_KEY = "eduhub.payrollSubmitDemo.version";

/** Feb–Apr 2026 — three schedule months (4 meetings each), all marked held on seed. */
export const PAYROLL_SUBMIT_DEMO_SLOTS: SessionSlotLike[] = [
  { title: "Orientation & placement", sessionDate: "2026-02-03", sessionTime: "10:00" },
  { title: "Speaking foundations", sessionDate: "2026-02-10", sessionTime: "10:00" },
  { title: "Listening lab", sessionDate: "2026-02-17", sessionTime: "10:00" },
  { title: "Month 1 review", sessionDate: "2026-02-24", sessionTime: "10:00" },
  { title: "Business writing I", sessionDate: "2026-03-03", sessionTime: "10:00" },
  { title: "Email workshop", sessionDate: "2026-03-10", sessionTime: "10:00" },
  { title: "Meetings role-play", sessionDate: "2026-03-17", sessionTime: "10:00" },
  { title: "Month 2 review", sessionDate: "2026-03-24", sessionTime: "10:00" },
  { title: "Presentations", sessionDate: "2026-04-07", sessionTime: "10:00" },
  { title: "Negotiation basics", sessionDate: "2026-04-14", sessionTime: "10:00" },
  { title: "Case study", sessionDate: "2026-04-21", sessionTime: "10:00" },
  { title: "Month 3 wrap-up", sessionDate: "2026-04-28", sessionTime: "10:00" },
];

export const PAYROLL_SUBMIT_DEMO_SCHEDULE_KEY = `${PAYROLL_SUBMIT_DEMO_TITLE}\t${PAYROLL_SUBMIT_DEMO_TITLE}`;

const DEMO_ENROLLED = [
  {
    id: "payroll-demo-student-a",
    fullName: "Demo Student A",
    email: "payroll.demo.a@example.com",
    enrolledAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "payroll-demo-student-b",
    fullName: "Demo Student B",
    email: "payroll.demo.b@example.com",
    enrolledAt: "2026-02-01T10:00:00.000Z",
  },
] as const;

export function isPayrollSubmitDemoCourse(course: Pick<TeacherCourse, "id">): boolean {
  return course.id === PAYROLL_SUBMIT_DEMO_COURSE_ID;
}

export function getPayrollSubmitDemoEnrolledStudents() {
  return DEMO_ENROLLED.map((student) => ({ ...student }));
}

function buildDemoCourse(instructorName: string): TeacherCourse {
  const now = new Date().toISOString();
  return {
    id: PAYROLL_SUBMIT_DEMO_COURSE_ID,
    title: PAYROLL_SUBMIT_DEMO_TITLE,
    description: "Demo class for testing payroll submission — 3-month schedule (Feb–Apr 2026), all meetings completed.",
    instructorName: instructorName.trim() || "Instructor",
    classMeetingsInSixMonths: PAYROLL_SUBMIT_DEMO_SLOTS.length,
    classMeetingSlots: PAYROLL_SUBMIT_DEMO_SLOTS.map((slot) => ({
      title: slot.title ?? "",
      sessionDate: slot.sessionDate ?? "",
      sessionTime: slot.sessionTime ?? "",
    })),
    price: PAYROLL_SUBMIT_DEMO_PRICE_PER_STUDENT,
    priceCurrency: PAYROLL_SUBMIT_DEMO_PRICE_CURRENCY,
    enrollmentCount: DEMO_ENROLLED.length,
    lessons: [],
    createdAt: now,
    updatedAt: now,
    status: "PUBLISHED",
  };
}

export function seedPayrollSubmitDemoAttendance(): void {
  for (const slot of PAYROLL_SUBMIT_DEMO_SLOTS) {
    markScheduleSlotHeld(PAYROLL_SUBMIT_DEMO_LINK_ID, scheduleSlotKeyFromParts(slot));
  }
}

/** Upsert local demo class + mark every meeting as held so payroll submit is enabled for each schedule month. */
export function ensurePayrollSubmitDemo(instructorName: string): TeacherCourse {
  const demo = buildDemoCourse(instructorName);
  teacherCoursesStore.upsertById(PAYROLL_SUBMIT_DEMO_COURSE_ID, demo);
  seedPayrollSubmitDemoAttendance();
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PAYROLL_SUBMIT_DEMO_VERSION_KEY, String(PAYROLL_SUBMIT_DEMO_DATA_VERSION));
  }
  return demo;
}
