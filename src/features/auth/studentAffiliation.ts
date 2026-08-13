/** Stored in `latestSchool` when the student selects internal affiliation. */
export const TUES_UNIVERSITY_SCHOOL_NAME = "TUES University";

/** Internal students are registered with TUES University (optionally ` · faculty`). */
export function isInternalStudent(latestSchool?: string | null): boolean {
  const value = latestSchool?.trim() ?? "";
  if (!value) return false;
  return (
    value === TUES_UNIVERSITY_SCHOOL_NAME ||
    value.startsWith(`${TUES_UNIVERSITY_SCHOOL_NAME} ·`) ||
    value.startsWith(`${TUES_UNIVERSITY_SCHOOL_NAME}·`)
  );
}
