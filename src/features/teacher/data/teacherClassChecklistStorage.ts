/**
 * Per-instructor, per-course checklist (browser local only).
 * Independent from student attendance / QR roll columns.
 */

export const TEACHER_CLASS_CHECKLIST_STORAGE_KEY = "eduhub_teacher_class_checklist_v1";
export const TEACHER_CLASS_CHECKLIST_CHANGED = "eduhub-teacher-class-checklist-changed";

export const DEFAULT_TEACHER_CLASS_CHECKLIST_ITEMS: readonly { readonly id: string; readonly label: string }[] = [
  {
    id: "session_ready",
    label: "I'm ready for this session (QR, roster, timing, materials)",
  },
] as const;

/** Per-student instructor verification for a QR attendance session. */
export function instructorVerifyItemId(
  sessionId: string,
  studentId: string,
  studentEmail: string,
): string {
  const sid = studentId?.trim() || `email:${studentEmail.trim().toLowerCase()}`;
  return `verify:${sessionId}:${sid}`;
}

type ChecklistRoot = Record<string, Record<string, Record<string, true>>>;

function readRoot(): ChecklistRoot {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(TEACHER_CLASS_CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ChecklistRoot;
  } catch {
    return {};
  }
}

function writeRoot(root: ChecklistRoot) {
  if (typeof localStorage === "undefined" || typeof window === "undefined") return;
  try {
    localStorage.setItem(TEACHER_CLASS_CHECKLIST_STORAGE_KEY, JSON.stringify(root));
  } catch (e) {
    console.warn("[teacher checklist] could not persist", e);
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ userKey?: string; courseId?: string }>(TEACHER_CLASS_CHECKLIST_CHANGED, {
      detail: {},
    }),
  );
}

export function teacherClassChecklistUserKey(userId: string | undefined, email: string | undefined): string {
  const id = userId?.trim();
  if (id) return id;
  const e = email?.trim().toLowerCase();
  return e ? `email:${e}` : "";
}

export function getTeacherClassChecklist(userKey: string, courseId: string): Record<string, boolean> {
  if (!userKey || !courseId) return {};
  const raw = readRoot()[userKey]?.[courseId];
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === true) out[k] = true;
  }
  return out;
}

export function setTeacherClassChecklistItem(
  userKey: string,
  courseId: string,
  itemId: string,
  checked: boolean,
) {
  if (!userKey || !courseId || !itemId) return;
  const root = readRoot();
  const byUser = { ...(root[userKey] ?? {}) };
  const prevCourse = byUser[courseId];
  const nextCourse: Record<string, true> = { ...(typeof prevCourse === "object" && prevCourse ? prevCourse : {}) };
  if (checked) nextCourse[itemId] = true;
  else delete nextCourse[itemId];
  if (Object.keys(nextCourse).length === 0) {
    const { [courseId]: _, ...restUser } = byUser;
    if (Object.keys(restUser).length === 0) {
      const { [userKey]: __, ...restRoot } = root;
      writeRoot(restRoot);
      return;
    }
    root[userKey] = restUser;
    writeRoot(root);
    return;
  }
  byUser[courseId] = nextCourse;
  root[userKey] = byUser;
  writeRoot(root);
}

export function clearTeacherClassChecklist(userKey: string, courseId: string) {
  if (!userKey || !courseId) return;
  const root = readRoot();
  const byUser = { ...(root[userKey] ?? {}) };
  if (!byUser[courseId]) return;
  const { [courseId]: _, ...rest } = byUser;
  if (Object.keys(rest).length === 0) {
    const { [userKey]: __, ...restRoot } = root;
    writeRoot(restRoot);
    return;
  }
  root[userKey] = rest;
  writeRoot(root);
}
