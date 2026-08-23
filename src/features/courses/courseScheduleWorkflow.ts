import type { CourseResponse } from "@/api/eduhubTypes";

export type ScheduleWorkflowStatus = "none" | "pending_instructor" | "approved" | "instructor_rejected";

export type CourseScheduleWorkflowRecord = {
  courseId: string;
  status: ScheduleWorkflowStatus;
  rejectionNote?: string;
  /** Course's last-updated time when approved/rejected — the backend doesn't track a separate schedule-review timestamp. */
  reviewedAt?: string;
};

/**
 * Derives the schedule-approval workflow state from the course's own status —
 * mirrors backend transitions in CourseService.proposeSchedule/approveSchedule/rejectSchedule.
 * Rejection sends the course back to DRAFT with `scheduleRejectionNote` set, so that combination
 * is how we distinguish "instructor rejected the proposal" from "never proposed".
 */
export function deriveScheduleWorkflow(course: CourseResponse | null | undefined): CourseScheduleWorkflowRecord | null {
  if (!course) return null;
  if (course.status === "SCHEDULE_PENDING") {
    return { courseId: course.id, status: "pending_instructor" };
  }
  if (course.status === "SCHEDULE_APPROVED" || course.status === "PUBLISHED") {
    return { courseId: course.id, status: "approved", reviewedAt: course.updatedAt };
  }
  if (course.status === "DRAFT" && course.scheduleRejectionNote?.trim()) {
    return {
      courseId: course.id,
      status: "instructor_rejected",
      rejectionNote: course.scheduleRejectionNote.trim(),
      reviewedAt: course.updatedAt,
    };
  }
  return { courseId: course.id, status: "none" };
}
