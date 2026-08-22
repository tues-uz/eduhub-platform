/**
 * Client-side mirror of the backend's placement gate
 * ({@code EnrollmentApplicationService.enforcePlacementLevelGate}), used only to decide what to
 * *show* the student before they apply. The backend remains the source of truth and re-checks on
 * submit — this exists so the "you don't qualify yet" message appears on the class card instead
 * of after the student fills in the enrollment form and gets rejected.
 */
export type PlacementGateStatus =
  | { gated: false }
  | { gated: true; qualifies: true }
  | { gated: true; qualifies: false; reason: "no_attempt" }
  | { gated: true; qualifies: false; reason: "below_level"; achievedLevelCode: string };

export function resolvePlacementGate(params: {
  courseSubject?: string | null;
  courseLevel?: string | null;
  /** Subjects (lowercased) with at least one published placement test. */
  publishedTestSubjects: Set<string>;
  /** The student's achieved level per subject (lowercased subject -> level code). */
  achievedLevelBySubject: Map<string, string>;
  /** sortOrder for each level code, higher = more advanced. */
  levelSortOrderByCode: Map<string, number>;
}): PlacementGateStatus {
  const { courseSubject, courseLevel, publishedTestSubjects, achievedLevelBySubject, levelSortOrderByCode } = params;

  const subject = courseSubject?.trim().toLowerCase();
  const requiredLevelCode = courseLevel?.trim();
  if (!subject || !requiredLevelCode) {
    return { gated: false };
  }
  if (!publishedTestSubjects.has(subject)) {
    return { gated: false };
  }

  const requiredSortOrder = levelSortOrderByCode.get(requiredLevelCode);
  if (requiredSortOrder === undefined) {
    return { gated: false }; // unknown level code — mirrors the backend's "don't block on data we can't interpret"
  }

  const achievedLevelCode = achievedLevelBySubject.get(subject);
  if (!achievedLevelCode) {
    return { gated: true, qualifies: false, reason: "no_attempt" };
  }

  const achievedSortOrder = levelSortOrderByCode.get(achievedLevelCode);
  if (achievedSortOrder === undefined) {
    return { gated: true, qualifies: true }; // stale level code — mirrors the backend's "don't block on stale data"
  }

  if (achievedSortOrder < requiredSortOrder) {
    return { gated: true, qualifies: false, reason: "below_level", achievedLevelCode };
  }
  return { gated: true, qualifies: true };
}
