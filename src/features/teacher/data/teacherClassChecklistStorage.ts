/**
 * Per-instructor, per-course checklist (browser local only).
 * Independent from student attendance / QR roll columns.
 */

export const TEACHER_CLASS_CHECKLIST_CHANGED = "eduhub-teacher-class-checklist-changed";
export const TEACHER_CLASS_CHECKLIST_STORAGE_KEY = "eduhub-teacher-class-checklist";

export type ChecklistItem = {
  id: string;
  label: string;
};

/** Shape: { [userKey]: { [courseId]: { [itemId]: true } } } */
export type ChecklistRoot = Record<string, Record<string, Record<string, true>>>;

export const instructorVerifyItemId = "instructor-verify";

export const DEFAULT_TEACHER_CLASS_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: instructorVerifyItemId, label: "Verify attendance" },
  { id: "share-materials", label: "Share class materials" },
  { id: "post-recap", label: "Post session recap" },
  { id: "grade-quiz", label: "Grade quiz / assignment" },
];

let memoryChecklistRoot: ChecklistRoot = {};

function readRoot(): ChecklistRoot {

  return memoryChecklistRoot;
}

function writeRoot(root: ChecklistRoot) {
  memoryChecklistRoot = root;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ userKey?: string; courseId?: string }>(TEACHER_CLASS_CHECKLIST_CHANGED, {
        detail: {},
      }),
    );
  }
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
