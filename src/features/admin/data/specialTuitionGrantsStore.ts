export const SPECIAL_TUITION_GRANTS_CHANGED_EVENT = "eduhub-special-tuition-grants-changed";

export type SpecialTuitionGrant = {
  id: string;
  /** Normalized lowercase email. */
  email: string;
  /** When null, grant applies to every class. */
  courseId: string | null;
  courseTitle?: string;
  note: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SpecialTuitionGrantInput = {
  email: string;
  courseId: string | null;
  courseTitle?: string;
  note?: string;
  active?: boolean;
};

let memoryGrants: SpecialTuitionGrant[] = [];

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SPECIAL_TUITION_GRANTS_CHANGED_EVENT));
  }
}

export function readSpecialTuitionGrants(): SpecialTuitionGrant[] {
  return [...memoryGrants].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function writeSpecialTuitionGrants(grants: SpecialTuitionGrant[]) {
  memoryGrants = grants;
  notifyChanged();
}

export function findActiveSpecialTuitionGrant(email: string, courseId: string): SpecialTuitionGrant | null {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm || !courseId.trim()) return null;
  const active = readSpecialTuitionGrants().filter((g) => g.active);
  const specific = active.find((g) => g.email === emailNorm && g.courseId === courseId);
  if (specific) return specific;
  return active.find((g) => g.email === emailNorm && g.courseId == null) ?? null;
}

export function upsertSpecialTuitionGrant(input: SpecialTuitionGrantInput): SpecialTuitionGrant {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
  const courseId = input.courseId?.trim() ? input.courseId.trim() : null;
  const now = new Date().toISOString();
  const all = readSpecialTuitionGrants();
  const existingIdx = all.findIndex((g) => g.email === email && g.courseId === courseId);
  const next: SpecialTuitionGrant = {
    id: existingIdx >= 0 ? all[existingIdx].id : crypto.randomUUID(),
    email,
    courseId,
    courseTitle: input.courseTitle?.trim() || undefined,
    note: input.note?.trim().slice(0, 280) ?? "",
    active: input.active ?? true,
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) {
    all[existingIdx] = next;
  } else {
    all.unshift(next);
  }
  writeSpecialTuitionGrants(all);
  return next;
}

export function setSpecialTuitionGrantActive(id: string, active: boolean) {
  const all = readSpecialTuitionGrants();
  const idx = all.findIndex((g) => g.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], active, updatedAt: new Date().toISOString() };
  writeSpecialTuitionGrants(all);
}

export function deleteSpecialTuitionGrant(id: string) {
  writeSpecialTuitionGrants(readSpecialTuitionGrants().filter((g) => g.id !== id));
}

