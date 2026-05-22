export type CourseFinalGradeRecord = {
  studentId: string;
  /** Instructor-entered score 0–100 */
  instructorScore: number;
  /** @deprecated Legacy field — same as instructorScore */
  finalScore?: number;
  /** Attendance % (sessions attended ÷ planned) at save time */
  attendanceScore?: number;
  /** Average of attendance + instructor scores when both exist */
  totalFinalScore?: number;
  comment?: string;
  updatedAt: string;
  updatedByEmail?: string;
};

/** 0–100 from QR sessions attended vs planned schedule meetings. */
export function computeAttendanceScore(
  attended: number,
  plannedSessions: number | null | undefined,
): number | null {
  if (plannedSessions == null || plannedSessions <= 0) return null;
  return Math.min(100, Math.round((attended / plannedSessions) * 100));
}

/** Combined final: 50% attendance + 50% instructor when both exist. */
export function computeTotalFinalScore(
  attendanceScore: number | null,
  instructorScore: number | null,
): number | null {
  if (attendanceScore != null && instructorScore != null) {
    return Math.round(((attendanceScore + instructorScore) / 2) * 10) / 10;
  }
  if (instructorScore != null) return instructorScore;
  if (attendanceScore != null) return attendanceScore;
  return null;
}

export function readInstructorScore(record?: CourseFinalGradeRecord): number | undefined {
  if (!record) return undefined;
  if (typeof record.instructorScore === "number") return record.instructorScore;
  if (typeof record.finalScore === "number") return record.finalScore;
  return undefined;
}

const STORAGE_PREFIX = "eduhub_course_final_grades__";

export const COURSE_FINAL_GRADES_CHANGED = "eduhub-course-final-grades-changed";

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(courseId)}`;
}

function loadMap(courseId: string): Record<string, CourseFinalGradeRecord> {
  if (typeof window === "undefined" || !courseId.trim()) return {};
  try {
    const raw = localStorage.getItem(storageKey(courseId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CourseFinalGradeRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMap(courseId: string, map: Record<string, CourseFinalGradeRecord>): void {
  if (typeof window === "undefined" || !courseId.trim()) return;
  try {
    localStorage.setItem(storageKey(courseId), JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent(COURSE_FINAL_GRADES_CHANGED, { detail: { courseId } }),
    );
  } catch {
    /* ignore quota */
  }
}

export function listCourseFinalGrades(courseId: string): Record<string, CourseFinalGradeRecord> {
  return loadMap(courseId);
}

export function getCourseFinalGrade(
  courseId: string,
  studentId: string,
): CourseFinalGradeRecord | undefined {
  return loadMap(courseId)[studentId];
}

export function saveCourseFinalGrade(
  courseId: string,
  record: CourseFinalGradeRecord,
): void {
  const map = loadMap(courseId);
  const instructorScore = record.instructorScore ?? record.finalScore ?? 0;
  map[record.studentId] = {
    ...record,
    instructorScore,
    finalScore: instructorScore,
  };
  saveMap(courseId, map);
}

export function deleteCourseFinalGrade(courseId: string, studentId: string): void {
  const map = loadMap(courseId);
  delete map[studentId];
  saveMap(courseId, map);
}

/** Clamp and validate a final score for storage. Returns null if invalid. */
export function parseFinalScoreInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}
