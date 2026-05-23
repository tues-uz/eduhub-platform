const STORAGE_KEY = "eduhub.courseReviewAudit.v1";

export type CourseReviewAuditRecord = {
  courseId: string;
  decision: "APPROVE" | "REJECT";
  adminActionCode: string;
  reviewedAt: string;
};

function loadAll(): Record<string, CourseReviewAuditRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CourseReviewAuditRecord>;
  } catch {
    return {};
  }
}

function saveAll(next: Record<string, CourseReviewAuditRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const courseReviewAuditStore = {
  get(courseId: string): CourseReviewAuditRecord | null {
    if (!courseId) return null;
    return loadAll()[courseId] ?? null;
  },

  record(courseId: string, decision: "APPROVE" | "REJECT", adminActionCode: string) {
    const all = loadAll();
    all[courseId] = {
      courseId,
      decision,
      adminActionCode,
      reviewedAt: new Date().toISOString(),
    };
    saveAll(all);
  },
};
