import type { StudentCourseEnrollmentDisplayStatus } from "@/features/enrollment/studentCourseEnrollmentStatus";

/** Maximum students allowed per teacher-created class. */
export const TEACHER_CLASS_MAX_STUDENTS = 20;

export function isTeacherClassFull(enrollmentCount: number | undefined | null): boolean {
  return (enrollmentCount ?? 0) >= TEACHER_CLASS_MAX_STUDENTS;
}

/** Whether a student may start or submit a new enrollment application. */
export function canApplyToTeacherClass(
  enrollmentStatus: StudentCourseEnrollmentDisplayStatus | undefined,
  enrollmentCount: number | undefined | null,
): boolean {
  if (enrollmentStatus === "enrolled" || enrollmentStatus === "pending_review") {
    return true;
  }
  return !isTeacherClassFull(enrollmentCount);
}
