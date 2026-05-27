import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";

/** How a class appears to the student in browse / catalog UI. */
export type StudentCourseEnrollmentDisplayStatus =
  | "enrolled"
  | "pending_review"
  | "rejected"
  | "not_enrolled";

export const ENROLLMENT_STATUS_BADGE: Record<
  Exclude<StudentCourseEnrollmentDisplayStatus, "not_enrolled">,
  { label: string; className: string }
> = {
  enrolled: {
    label: "Enrolled",
    className: "bg-[#3954d0] text-white border border-white/50",
  },
  pending_review: {
    label: "Pending review",
    className: "bg-amber-100 text-amber-800",
  },
  rejected: {
    label: "Application declined",
    className: "bg-red-100 text-red-800",
  },
};

/** Latest application per courseId (newest submittedAt wins). */
export function indexEnrollmentApplicationsByCourse(
  rows: EnrollmentApplicationResponse[],
): Map<string, EnrollmentApplicationResponse> {
  const map = new Map<string, EnrollmentApplicationResponse>();
  for (const r of rows) {
    const prev = map.get(r.courseId);
    if (!prev || r.submittedAt.localeCompare(prev.submittedAt) > 0) {
      map.set(r.courseId, r);
    }
  }
  return map;
}

export function resolveStudentCourseEnrollmentDisplayStatus(
  courseId: string,
  emailNorm: string,
  isEnrolledFromApi: boolean,
  apiApplication?: EnrollmentApplicationResponse,
): StudentCourseEnrollmentDisplayStatus {
  if (isEnrolledFromApi) return "enrolled";
  if (emailNorm && enrollmentApplicationStore.isApprovedForCourse(courseId, emailNorm)) {
    return "enrolled";
  }

  const apiStatus = apiApplication?.status;
  if (apiStatus === "PENDING") return "pending_review";
  if (apiStatus === "APPROVED") return "enrolled";

  if (emailNorm) {
    if (enrollmentApplicationStore.findPendingForCourseAndEmail(courseId, emailNorm)) {
      return "pending_review";
    }
    const latest = enrollmentApplicationStore.findLatestForCourseAndEmail(courseId, emailNorm);
    if (latest?.status === "APPROVED") return "enrolled";
    if (latest?.status === "REJECTED") return "rejected";
    if (apiStatus === "REJECTED") return "rejected";
  } else if (apiStatus === "REJECTED") {
    return "rejected";
  }

  return "not_enrolled";
}
