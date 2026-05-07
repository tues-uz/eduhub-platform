/**
 * Last schedule snapshot saved from the admin schedule editor.
 * Used when GET /courses/{id} omits `classMeetingSlots` / counts (backend gap) so instructors still see the proposal
 * on the same device. Cross-device still requires API to return schedule fields.
 */

import type { ClassMeetingSlot } from "@/features/teacher/types";

export type CourseScheduleProposal = {
  classMeetingsInSixMonths: number;
  classMeetingSlots: ClassMeetingSlot[];
  updatedAt: string;
};

/** Exported so UI can listen for cross-tab `storage` updates. */
export const COURSE_SCHEDULE_PROPOSAL_STORAGE_KEY = "eduhub.courseScheduleProposals.v1";
const STORAGE_KEY = COURSE_SCHEDULE_PROPOSAL_STORAGE_KEY;

function loadAll(): Record<string, CourseScheduleProposal> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CourseScheduleProposal>;
  } catch {
    return {};
  }
}

function saveAll(next: Record<string, CourseScheduleProposal>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const courseScheduleProposalStore = {
  get(courseId: string): CourseScheduleProposal | null {
    if (!courseId) return null;
    const all = loadAll();
    const row = all[courseId];
    if (!row || typeof row.classMeetingsInSixMonths !== "number") return null;
    if (!Array.isArray(row.classMeetingSlots)) return null;
    return row;
  },

  save(courseId: string, proposal: Pick<CourseScheduleProposal, "classMeetingsInSixMonths" | "classMeetingSlots">) {
    const all = loadAll();
    all[courseId] = {
      classMeetingsInSixMonths: proposal.classMeetingsInSixMonths,
      classMeetingSlots: proposal.classMeetingSlots.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      })),
      updatedAt: new Date().toISOString(),
    };
    saveAll(all);
    try {
      window.dispatchEvent(new CustomEvent("eduhub-schedule-proposal-saved", { detail: { courseId } }));
    } catch {
      /* ignore */
    }
  },
};
