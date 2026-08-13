/** Local gallery for lecturer class photos (up to 8). Shared across teacher + student views. */

export const CLASS_PHOTOS_CHANGED_EVENT = "eduhub-class-photos-changed";
export const MAX_CLASS_PHOTOS = 8;

const STORAGE_KEY = "eduhub_class_photos_v1";

type StoreMap = Record<string, string[]>;

function notifyChanged(courseId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLASS_PHOTOS_CHANGED_EVENT, { detail: { courseId } }));
}

function readMap(): StoreMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: StoreMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota / private mode.
  }
}

function normalizeUrls(urls: string[]): string[] {
  return urls
    .filter((u) => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim())
    .slice(0, MAX_CLASS_PHOTOS);
}

export const classPhotoStore = {
  has(courseId: string): boolean {
    const id = courseId.trim();
    if (!id) return false;
    return Object.prototype.hasOwnProperty.call(readMap(), id);
  },

  get(courseId: string): string[] {
    const id = courseId.trim();
    if (!id) return [];
    return normalizeUrls(readMap()[id] ?? []);
  },

  set(courseId: string, urls: string[]): string[] {
    const id = courseId.trim();
    if (!id) return [];
    const next = normalizeUrls(urls);
    const map = readMap();
    map[id] = next;
    writeMap(map);
    notifyChanged(id);
    return next;
  },
};

/** Prefer local teacher uploads when present; otherwise API gallery. */
export function resolveClassPhotoUrls(
  courseId: string | undefined,
  apiUrls?: string[] | null,
): string[] {
  const id = courseId?.trim() ?? "";
  if (id && classPhotoStore.has(id)) {
    return classPhotoStore.get(id);
  }
  return normalizeUrls(apiUrls ?? []);
}
