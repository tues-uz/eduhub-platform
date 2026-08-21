import { ApiError, eduhubMarketingPromos } from "@/api/eduhubClient";
import type { MarketingPromo, MarketingPromoInput } from "@/api/eduhubTypes";

export const STUDENT_PROMOS_CHANGED_EVENT = "eduhub-promos-changed";

export type StudentPromoPlacement = "my-class" | "dashboard" | "all";

export type StudentPromo = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  accentColor: string;
  placement: StudentPromoPlacement;
  active: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type StudentPromoInput = Omit<StudentPromo, "id" | "updatedAt"> & { id?: string };

// Active promotions are fetched from and persisted to the eduhub-api backend.

function normalizePromo(raw: unknown): StudentPromo | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;

  const placement =
    o.placement === "dashboard" || o.placement === "all" || o.placement === "my-class"
      ? o.placement
      : "my-class";

  return {
    id: o.id,
    title: o.title.trim().slice(0, 120),
    body: typeof o.body === "string" ? o.body.trim().slice(0, 280) : "",
    ctaLabel: typeof o.ctaLabel === "string" ? o.ctaLabel.trim().slice(0, 40) : "Learn more",
    ctaUrl: typeof o.ctaUrl === "string" ? o.ctaUrl.trim().slice(0, 512) : "/eduhub",
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl.trim().slice(0, 2048) : "",
    accentColor:
      typeof o.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(o.accentColor)
        ? o.accentColor
        : "#3954d0",
    placement,
    active: o.active !== false,
    sortOrder: typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder) ? o.sortOrder : 0,
    startsAt: typeof o.startsAt === "string" ? o.startsAt : null,
    endsAt: typeof o.endsAt === "string" ? o.endsAt : null,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

let memoryPromos: StudentPromo[] = [];

function readRawPromos(): StudentPromo[] {
  return memoryPromos;
}

function notifyPromosChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STUDENT_PROMOS_CHANGED_EVENT));
  }
}

export function readStudentPromos(): StudentPromo[] {
  const stored = readRawPromos();
  return [...stored].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

export function readStudentPromosWithDefaults(): StudentPromo[] {
  return readStudentPromos();
}

export function writeStudentPromos(promos: StudentPromo[]) {
  memoryPromos = promos;
  notifyPromosChanged();
}

function toInput(next: StudentPromo): MarketingPromoInput {
  return {
    title: next.title,
    body: next.body,
    ctaLabel: next.ctaLabel,
    ctaUrl: next.ctaUrl,
    imageUrl: next.imageUrl,
    accentColor: next.accentColor,
    placement: next.placement,
    active: next.active,
    sortOrder: next.sortOrder,
    startsAt: next.startsAt,
    endsAt: next.endsAt,
  };
}

function replaceInMemory(replacement: StudentPromo) {
  const all = readRawPromos();
  const idx = all.findIndex((p) => p.id === replacement.id);
  if (idx >= 0) {
    all[idx] = replacement;
  } else {
    all.push(replacement);
  }
  writeStudentPromos(all);
}

/** Hydrate the local cache from the backend. Admin loads all; others load the active feed. */
export async function loadStudentPromos(): Promise<void> {
  let fetched: MarketingPromo[] | undefined;
  const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const isAdmin = role === "admin";

  if (isAdmin) {
    try {
      fetched = await eduhubMarketingPromos.listAll();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        try {
          fetched = await eduhubMarketingPromos.listActive();
        } catch {
          return;
        }
      } else {
        return;
      }
    }
  } else {
    try {
      fetched = await eduhubMarketingPromos.listActive();
    } catch {
      return;
    }
  }

  if (fetched) {
    memoryPromos = fetched.map(normalizePromo).filter((p): p is StudentPromo => p !== null);
    notifyPromosChanged();
  }
}

export async function upsertStudentPromo(input: StudentPromoInput): Promise<StudentPromo> {
  const all = readStudentPromos();
  const now = new Date().toISOString();
  const next: StudentPromo = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title.trim().slice(0, 120),
    body: input.body.trim().slice(0, 280),
    ctaLabel: input.ctaLabel.trim().slice(0, 40) || "Learn more",
    ctaUrl: input.ctaUrl.trim().slice(0, 512) || "/eduhub",
    imageUrl: input.imageUrl.trim().slice(0, 2048),
    accentColor: input.accentColor,
    placement: input.placement,
    active: input.active,
    sortOrder: input.sortOrder,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    updatedAt: now,
  };

  const idx = all.findIndex((p) => p.id === next.id);
  if (idx >= 0) {
    all[idx] = next;
  } else {
    all.push(next);
  }
  writeStudentPromos(all);

  try {
    let persisted: MarketingPromo;
    if (input.id) {
      try {
        persisted = await eduhubMarketingPromos.updatePromo(input.id, toInput(next));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          persisted = await eduhubMarketingPromos.createPromo(toInput(next));
        } else {
          throw e;
        }
      }
    } else {
      persisted = await eduhubMarketingPromos.createPromo(toInput(next));
    }
    const normalized = normalizePromo(persisted);
    if (normalized) replaceInMemory(normalized);
    return normalized ?? next;
  } catch (e) {
    console.error("[Promos] Failed to persist promo", e);
    throw e;
  }
}

export async function deleteStudentPromo(id: string): Promise<void> {
  const all = readStudentPromos().filter((p) => p.id !== id);
  writeStudentPromos(all);
  try {
    await eduhubMarketingPromos.deletePromo(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return;
    console.error("[Promos] Failed to delete promo", e);
    throw e;
  }
}

export function resetStudentPromosToDefaults() {
  writeStudentPromos([]);
}

function isWithinSchedule(promo: StudentPromo, now = new Date()): boolean {
  if (promo.startsAt) {
    const start = new Date(promo.startsAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (promo.endsAt) {
    const end = new Date(promo.endsAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

export function filterActiveStudentPromos(
  promos: StudentPromo[],
  placement: StudentPromoPlacement,
  now = new Date(),
): StudentPromo[] {
  return promos.filter(
    (p) =>
      p.active &&
      isWithinSchedule(p, now) &&
      (p.placement === placement || p.placement === "all"),
  );
}

export function listActiveStudentPromos(
  placement: StudentPromoPlacement,
  now = new Date(),
): StudentPromo[] {
  return filterActiveStudentPromos(readStudentPromosWithDefaults(), placement, now);
}

export const STUDENT_PROMO_PLACEMENT_LABELS: Record<StudentPromoPlacement, string> = {
  "my-class": "My Class",
  dashboard: "Dashboard",
  all: "All student pages",
};