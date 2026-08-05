export type CourseReviewAuditRecord = {
  courseId: string;
  decision: "APPROVE" | "REJECT";
  adminActionCode: string;
  reviewedAt: string;
};

let inMemoryAudits: Record<string, CourseReviewAuditRecord> = {};

export const courseReviewAuditStore = {
  get(courseId: string): CourseReviewAuditRecord | null {
    if (!courseId) return null;
    return inMemoryAudits[courseId] ?? null;
  },

  record(courseId: string, decision: "APPROVE" | "REJECT", adminActionCode: string) {
    inMemoryAudits[courseId] = {
      courseId,
      decision,
      adminActionCode,
      reviewedAt: new Date().toISOString(),
    };
  },
};

