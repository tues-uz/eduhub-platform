import type { StudentAffiliation } from "@/api/eduhubTypes";

/** Stored in `latestSchool` when the student selects internal affiliation. */
export const TUES_UNIVERSITY_SCHOOL_NAME = "TUES University";

/** Internal students are registered with TUES University (or studentAffiliation = INTERNAL). */
export function isInternalStudent(
  input?: string | { studentAffiliation?: StudentAffiliation | string | null; latestSchool?: string | null } | null,
): boolean {
  if (!input) return false;
  if (typeof input === "object") {
    if (input.studentAffiliation) {
      return String(input.studentAffiliation).toUpperCase() === "INTERNAL";
    }
    return isInternalStudent(input.latestSchool);
  }
  const value = input.trim();
  if (!value) return false;
  return (
    value.toUpperCase() === "INTERNAL" ||
    value === TUES_UNIVERSITY_SCHOOL_NAME ||
    value.startsWith(`${TUES_UNIVERSITY_SCHOOL_NAME} ·`) ||
    value.startsWith(`${TUES_UNIVERSITY_SCHOOL_NAME}·`)
  );
}
