/**
 * Client-side schedule approval workflow until the API supports it.
 * Admin proposes schedule → instructor approves or requests changes.
 */

export type ScheduleWorkflowStatus = "none" | "pending_instructor" | "approved" | "instructor_rejected";

export type CourseScheduleWorkflowRecord = {
  courseId: string;
  status: ScheduleWorkflowStatus;
  proposedAt?: string;
  reviewedAt?: string;
  rejectionNote?: string;
};

let memoryWorkflows: Record<string, CourseScheduleWorkflowRecord> = {};

function loadAll(): Record<string, CourseScheduleWorkflowRecord> {
  return memoryWorkflows;
}

function saveAll(next: Record<string, CourseScheduleWorkflowRecord>) {
  memoryWorkflows = next;
}


function notifyWorkflowUpdated(courseId: string) {
  try {
    window.dispatchEvent(new CustomEvent("eduhub-schedule-workflow-updated", { detail: { courseId } }));
  } catch {
    /* ignore */
  }
}

export const courseScheduleWorkflowStore = {
  get(courseId: string): CourseScheduleWorkflowRecord | null {
    if (!courseId) return null;
    const all = loadAll();
    return all[courseId] ?? null;
  },

  getAll(): CourseScheduleWorkflowRecord[] {
    return Object.values(loadAll());
  },

  /** After admin sends proposal to instructor. */
  sendToInstructor(courseId: string) {
    const all = loadAll();
    all[courseId] = {
      courseId,
      status: "pending_instructor",
      proposedAt: new Date().toISOString(),
      rejectionNote: undefined,
      reviewedAt: undefined,
    };
    saveAll(all);
    notifyWorkflowUpdated(courseId);
  },

  approve(courseId: string) {
    const all = loadAll();
    const prev = all[courseId];
    all[courseId] = {
      courseId,
      status: "approved",
      proposedAt: prev?.proposedAt,
      reviewedAt: new Date().toISOString(),
      rejectionNote: undefined,
    };
    saveAll(all);
    notifyWorkflowUpdated(courseId);
  },

  reject(courseId: string, note: string) {
    const all = loadAll();
    const prev = all[courseId];
    all[courseId] = {
      courseId,
      status: "instructor_rejected",
      proposedAt: prev?.proposedAt,
      reviewedAt: new Date().toISOString(),
      rejectionNote: note.trim() || undefined,
    };
    saveAll(all);
    notifyWorkflowUpdated(courseId);
  },
};
