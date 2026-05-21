import { useEffect, useState } from "react";
import type { CourseResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
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

/** Normalize API ISO strings to `YYYY-MM-DD` for date inputs. */
export function toDateInputValue(iso?: string): string {
  if (!iso?.trim()) return "";
  const d = iso.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
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
function boundsFromScheduleProposal(proposal?: ScheduleProposalResponse | null): {
  start?: string;
  end?: string;
  sessionCount?: number;
} {
  if (!proposal) return {};
  const slots = proposal.sessions?.map((s) => ({ sessionDate: s.sessionDate }));
  const bounds = boundsFromMeetingSlots(slots);
  const sessionCount =
    typeof proposal.sessionCount === "number" && proposal.sessionCount > 0
      ? proposal.sessionCount
      : proposal.sessions?.length;
  return { ...bounds, sessionCount: sessionCount && sessionCount > 0 ? sessionCount : undefined };
}

export function mergeScheduleDisplayForAdminReview(
  courseId: string,
  detail: CourseResponse,
  options?: { useLocalProposalSnapshot?: boolean; apiProposal?: ScheduleProposalResponse | null },
): {
  sessionsSixMo: number | undefined;
  classStartDate?: string;
  classEndDate?: string;
} {
  const fromApi = resolvedSessionsSixMonths(detail);
  const fromApiSlots = boundsFromMeetingSlots(detail.classMeetingSlots);
  const fromApiProposal = boundsFromScheduleProposal(options?.apiProposal);
  const localProposal =
    options?.useLocalProposalSnapshot === false ? null : courseScheduleProposalStore.get(courseId);
  const fromLocalProposalSlots = boundsFromMeetingSlots(localProposal?.classMeetingSlots);

  let sessionsSixMo = fromApiProposal.sessionCount ?? fromApi;
  if (sessionsSixMo == null && localProposal) {
    if (typeof localProposal.classMeetingsInSixMonths === "number" && localProposal.classMeetingsInSixMonths > 0) {
      sessionsSixMo = localProposal.classMeetingsInSixMonths;
    } else if (localProposal.classMeetingSlots?.length) {
      sessionsSixMo = localProposal.classMeetingSlots.length;
    }
  }

  const startTrim = detail.classStartDate?.trim();
  const endTrim = detail.classEndDate?.trim();
  let classStartDate = startTrim || fromApiSlots.start || fromApiProposal.start;
  let classEndDate = endTrim || fromApiSlots.end || fromApiProposal.end;
  if (!classStartDate) classStartDate = fromLocalProposalSlots.start;
  if (!classEndDate) classEndDate = fromLocalProposalSlots.end;

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
