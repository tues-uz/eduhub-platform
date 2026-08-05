export type ManualQuizColumn = {
  id: string;
  title: string;
  createdAt: string;
  /** Schedule slot key from approved class schedule, e.g. `slot-0`. */
  sessionSlotKey?: string;
  /** Human label for the linked session. */
  sessionLabel?: string;
  /** `YYYY-MM-DD` from the linked schedule row. */
  sessionDate?: string;
};

export type AddManualQuizColumnInput = {
  title: string;
  sessionSlotKey?: string;
  sessionLabel?: string;
  sessionDate?: string;
};

/** studentId → quizColumnId → score (0–100) */
export type ManualQuizScoreMap = Record<string, Record<string, number>>;

export type ManualQuizScoresCourseData = {
  columns: ManualQuizColumn[];
  scores: ManualQuizScoreMap;
};

const STORAGE_PREFIX = "eduhub_manual_quiz_scores__";

export const MANUAL_QUIZ_SCORES_CHANGED = "eduhub-manual-quiz-scores-changed";

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(courseId)}`;
}

function emptyData(): ManualQuizScoresCourseData {
  return { columns: [], scores: {} };
}

function loadData(courseId: string): ManualQuizScoresCourseData {
  if (typeof window === "undefined" || !courseId.trim()) return emptyData();
  try {
    const raw = localStorage.getItem(storageKey(courseId));
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as ManualQuizScoresCourseData;
    if (!parsed || typeof parsed !== "object") return emptyData();
    return {
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
    };
  } catch {
    return emptyData();
  }
}

function saveData(courseId: string, data: ManualQuizScoresCourseData): void {
  if (typeof window === "undefined" || !courseId.trim()) return;
  try {
    localStorage.setItem(storageKey(courseId), JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent(MANUAL_QUIZ_SCORES_CHANGED, { detail: { courseId } }),
    );
  } catch {
    /* ignore quota */
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getManualQuizScoresData(courseId: string): ManualQuizScoresCourseData {
  return loadData(courseId);
}

export function listManualQuizColumns(courseId: string): ManualQuizColumn[] {
  return loadData(courseId).columns;
}

export function addManualQuizColumn(
  courseId: string,
  titleOrInput: string | AddManualQuizColumnInput,
): ManualQuizColumn {
  const input: AddManualQuizColumnInput =
    typeof titleOrInput === "string" ? { title: titleOrInput } : titleOrInput;
  const data = loadData(courseId);
  const column: ManualQuizColumn = {
    id: newId(),
    title: input.title.trim() || "Quiz",
    createdAt: new Date().toISOString(),
    ...(input.sessionSlotKey?.trim() ? { sessionSlotKey: input.sessionSlotKey.trim() } : {}),
    ...(input.sessionLabel?.trim() ? { sessionLabel: input.sessionLabel.trim() } : {}),
    ...(input.sessionDate?.trim() ? { sessionDate: input.sessionDate.trim() } : {}),
  };
  data.columns = [...data.columns, column];
  saveData(courseId, data);
  return column;
}

export function renameManualQuizColumn(
  courseId: string,
  columnId: string,
  title: string,
): ManualQuizColumn | undefined {
  const data = loadData(courseId);
  const idx = data.columns.findIndex((c) => c.id === columnId);
  if (idx < 0) return undefined;
  const next = { ...data.columns[idx], title: title.trim() || data.columns[idx].title };
  data.columns = data.columns.map((c, i) => (i === idx ? next : c));
  saveData(courseId, data);
  return next;
}

export function deleteManualQuizColumn(courseId: string, columnId: string): void {
  const data = loadData(courseId);
  data.columns = data.columns.filter((c) => c.id !== columnId);
  for (const studentId of Object.keys(data.scores)) {
    if (data.scores[studentId]?.[columnId] != null) {
      const next = { ...data.scores[studentId] };
      delete next[columnId];
      if (Object.keys(next).length === 0) {
        delete data.scores[studentId];
      } else {
        data.scores[studentId] = next;
      }
    }
  }
  saveData(courseId, data);
}

export function getManualQuizScore(
  courseId: string,
  studentId: string,
  columnId: string,
): number | undefined {
  return loadData(courseId).scores[studentId]?.[columnId];
}

/** Persist a full student score row (quizId → number). Omits empty/invalid entries. */
export function saveManualQuizStudentScores(
  courseId: string,
  studentId: string,
  scores: Record<string, number | null>,
): void {
  const data = loadData(courseId);
  const next: Record<string, number> = {};
  for (const [quizId, value] of Object.entries(scores)) {
    if (value == null || !Number.isFinite(value)) continue;
    next[quizId] = value;
  }
  if (Object.keys(next).length === 0) {
    delete data.scores[studentId];
  } else {
    data.scores[studentId] = next;
  }
  saveData(courseId, data);
}

/** Clamp and validate a score for storage. Returns null if empty/invalid. */
export function parseManualQuizScoreInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}
