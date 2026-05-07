import { useEffect, useState } from "react";
import type { CourseResponse } from "@/api/eduhubTypes";
import {
  COURSE_SCHEDULE_PROPOSAL_STORAGE_KEY,
  courseScheduleProposalStore,
} from "@/features/courses/courseScheduleProposalStore";
import { COURSE_SCHEDULE_WORKFLOW_STORAGE_KEY } from "@/features/courses/courseScheduleWorkflowStore";

/** API sometimes omits `classMeetingsInSixMonths` but returns slots or titles arrays. */
export function resolvedSessionsSixMonths(c: CourseResponse): number | undefined {
  if (typeof c.classMeetingsInSixMonths === "number" && c.classMeetingsInSixMonths >= 0) {
    return c.classMeetingsInSixMonths;
  }
  const slotsLen = c.classMeetingSlots?.length ?? 0;
  if (slotsLen > 0) return slotsLen;
  const titlesLen = c.classMeetingTitles?.length ?? 0;
  if (titlesLen > 0) return titlesLen;
  return undefined;
}

export function boundsFromMeetingSlots(slots: { sessionDate?: string }[] | undefined): {
  start?: string;
  end?: string;
} {
  const sorted = (slots ?? [])
    .map((s) => s.sessionDate?.trim())
    .filter((d): d is string => !!d)
    .sort();
  if (!sorted.length) return {};
  return { start: sorted[0], end: sorted[sorted.length - 1] };
}

/**
 * GET /courses/{id} often omits schedule scalars; admin schedule editor persists a local snapshot.
 * Fill display-only fields from API, slot-derived bounds, then that snapshot.
 */
export function mergeScheduleDisplayForAdminReview(
  courseId: string,
  detail: CourseResponse,
  options?: { useLocalProposalSnapshot?: boolean },
): {
  sessionsSixMo: number | undefined;
  classStartDate?: string;
  classEndDate?: string;
} {
  const fromApi = resolvedSessionsSixMonths(detail);
  const fromApiSlots = boundsFromMeetingSlots(detail.classMeetingSlots);
  const proposal =
    options?.useLocalProposalSnapshot === false ? null : courseScheduleProposalStore.get(courseId);
  const fromProposalSlots = boundsFromMeetingSlots(proposal?.classMeetingSlots);

  let sessionsSixMo = fromApi;
  if (sessionsSixMo == null && proposal) {
    if (typeof proposal.classMeetingsInSixMonths === "number" && proposal.classMeetingsInSixMonths > 0) {
      sessionsSixMo = proposal.classMeetingsInSixMonths;
    } else if (proposal.classMeetingSlots?.length) {
      sessionsSixMo = proposal.classMeetingSlots.length;
    }
  }

  const startTrim = detail.classStartDate?.trim();
  const endTrim = detail.classEndDate?.trim();
  let classStartDate = startTrim || fromApiSlots.start;
  let classEndDate = endTrim || fromApiSlots.end;
  if (!classStartDate) classStartDate = fromProposalSlots.start;
  if (!classEndDate) classEndDate = fromProposalSlots.end;

  return {
    sessionsSixMo,
    classStartDate: classStartDate || undefined,
    classEndDate: classEndDate || undefined,
  };
}

/** Bump when workflow or saved schedule snapshot changes (same tab or other tab). */
export function useAdminCourseLocalDataVersion() {
  const [v, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("eduhub-schedule-workflow-updated", bump);
    window.addEventListener("eduhub-schedule-proposal-saved", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === COURSE_SCHEDULE_WORKFLOW_STORAGE_KEY || e.key === COURSE_SCHEDULE_PROPOSAL_STORAGE_KEY) {
        bump();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("eduhub-schedule-workflow-updated", bump);
      window.removeEventListener("eduhub-schedule-proposal-saved", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return v;
}
