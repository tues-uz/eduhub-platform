/**
 * Browser-local class resumes (recaps) per course — instructor-written notes for students.
 * Multiple entries per course. Same-origin only; replace with a server API when available.
 */
const V1_KEY = "eduhub_class_resume_v1";
const STORAGE_KEY = "eduhub_class_resumes_v2";
export const CLASS_RESUME_STORAGE_KEY = STORAGE_KEY;
export const CLASS_RESUME_CHANGED = "eduhub-class-resume-changed";

export type ClassResumeItem = {
  id: string;
  body: string;
  updatedAt: string;
  sessionSlotKey?: string;
  sessionLabel?: string;
  /** Local demo: a data URL (or remote URL if wired later). */
  thumbnailUrl?: string;
};

/** @deprecated use ClassResumeItem — kept for v1 migration typing */
export type ClassResumeRecord = Omit<ClassResumeItem, "id">;

type Store = Record<string, ClassResumeItem[]>;

function migrateV1ToV2(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return {};
    const v1 = JSON.parse(raw) as Record<string, ClassResumeRecord & { id?: string; thumbnailUrl?: string }>;
    if (!v1 || typeof v1 !== "object") return {};
    const out: Store = {};
    for (const [cid, rec] of Object.entries(v1)) {
      if (!rec || typeof rec.body !== "string" || !rec.body.trim()) continue;
      out[cid] = [
        {
          id: `migrated-${cid}`,
          body: rec.body.trim(),
          updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : new Date().toISOString(),
          ...(typeof rec.sessionSlotKey === "string" && rec.sessionSlotKey.trim()
            ? { sessionSlotKey: rec.sessionSlotKey.trim() }
            : {}),
          ...(typeof rec.sessionLabel === "string" && rec.sessionLabel.trim()
            ? { sessionLabel: rec.sessionLabel.trim() }
            : {}),
          ...(typeof rec.thumbnailUrl === "string" && rec.thumbnailUrl.trim()
            ? { thumbnailUrl: rec.thumbnailUrl.trim() }
            : {}),
        },
      ];
    }
    return out;
  } catch {
    return {};
  }
}

function readStore(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Store;
    }
    const migrated = migrateV1ToV2();
    if (Object.keys(migrated).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(V1_KEY);
    }
    return migrated;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof localStorage === "undefined" || typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("[classResume] Could not save to localStorage", e);
    return;
  }
  window.dispatchEvent(new CustomEvent(CLASS_RESUME_CHANGED, { detail: {} }));
}

function sortResumesDesc(items: ClassResumeItem[]): ClassResumeItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

export function listClassResumes(courseId: string): ClassResumeItem[] {
  if (!courseId) return [];
  const list = readStore()[courseId];
  if (!Array.isArray(list)) return [];
  return sortResumesDesc(list.filter((x) => x && typeof x.body === "string" && x.id));
}

export function getClassResumeById(courseId: string, resumeId: string): ClassResumeItem | null {
  if (!courseId || !resumeId) return null;
  const list = readStore()[courseId];
  if (!Array.isArray(list)) return null;
  return list.find((x) => x.id === resumeId) ?? null;
}

export function saveClassResume(
  courseId: string,
  payload: {
    id?: string;
    body: string;
    session?: { slotKey: string; label: string };
    thumbnailUrl?: string;
  },
): string | null {
  if (!courseId) return null;
  const trimmed = payload.body.trim();
  if (!trimmed) return null;

  const store = readStore();
  const existing = [...(store[courseId] ?? [])];
  const sessionKey = payload.session?.slotKey?.trim();
  const sessionLabel = payload.session?.label?.trim();
  const hasSession = Boolean(sessionKey && sessionLabel);
  const thumb = payload.thumbnailUrl?.trim();

  const id = payload.id?.trim();
  const idx = id ? existing.findIndex((x) => x.id === id) : -1;
  const now = new Date().toISOString();

  const buildEntry = (entryId: string): ClassResumeItem => ({
    id: entryId,
    body: trimmed,
    updatedAt: now,
    ...(hasSession ? { sessionSlotKey: sessionKey!, sessionLabel: sessionLabel! } : {}),
    ...(thumb ? { thumbnailUrl: thumb } : {}),
  });

  if (idx >= 0) {
    existing[idx] = buildEntry(existing[idx].id);
  } else {
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `resume-${Date.now()}`;
    existing.push(buildEntry(newId));
  }

  store[courseId] = existing;
  writeStore(store);
  return idx >= 0 ? existing[idx].id : existing[existing.length - 1]!.id;
}

export function deleteClassResume(courseId: string, resumeId: string) {
  if (!courseId || !resumeId) return;
  const store = readStore();
  const list = store[courseId];
  if (!Array.isArray(list)) return;
  const next = list.filter((x) => x.id !== resumeId);
  if (next.length === 0) {
    const copy = { ...store };
    delete copy[courseId];
    writeStore(copy);
  } else {
    store[courseId] = next;
    writeStore(store);
  }
}
