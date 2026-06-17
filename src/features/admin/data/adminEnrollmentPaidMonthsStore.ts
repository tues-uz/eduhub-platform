import { useSyncExternalStore } from "react";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";

const STORAGE_KEY = "eduhub.adminEnrollmentPaidMonths.v1";
export const ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED = "eduhub-enrollment-paid-months-changed";

export type AdminEnrollmentPaidMonthsRecord = {
  applicationId: string;
  courseId: string;
  studentEmailNorm: string;
  paidMonths: TuitionPlanMonths[];
  updatedAt: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED));
  }
}

let snapshot: Record<string, AdminEnrollmentPaidMonthsRecord> = {};

function parseStored(raw: string | null): Record<string, AdminEnrollmentPaidMonthsRecord> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, AdminEnrollmentPaidMonthsRecord> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const row = v as Record<string, unknown>;
      const paidMonths = Array.isArray(row.paidMonths)
        ? row.paidMonths.filter((m): m is TuitionPlanMonths => m === 1 || m === 2 || m === 3)
        : [];
      if (!paidMonths.length) continue;
      out[k] = {
        applicationId: typeof row.applicationId === "string" ? row.applicationId : k,
        courseId: typeof row.courseId === "string" ? row.courseId : "",
        studentEmailNorm: typeof row.studentEmailNorm === "string" ? row.studentEmailNorm : "",
        paidMonths,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota
  }
}

function hydrate() {
  snapshot = parseStored(
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
}

hydrate();

export const adminEnrollmentPaidMonthsStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): Record<string, AdminEnrollmentPaidMonthsRecord> {
    return snapshot;
  },

  get(applicationId: string): ReadonlySet<TuitionPlanMonths> | null {
    const row = snapshot[applicationId];
    if (!row?.paidMonths.length) return null;
    return new Set(row.paidMonths);
  },

  set(
    applicationId: string,
    paidMonths: Iterable<TuitionPlanMonths>,
    meta: { courseId: string; studentEmailNorm: string },
  ): void {
    const months = [...new Set(paidMonths)].filter((m) => m === 1 || m === 2 || m === 3).sort();
    if (!months.length) {
      const { [applicationId]: _, ...rest } = snapshot;
      snapshot = rest;
    } else {
      snapshot = {
        ...snapshot,
        [applicationId]: {
          applicationId,
          courseId: meta.courseId,
          studentEmailNorm: meta.studentEmailNorm,
          paidMonths: months,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    persist();
    emit();
  },

  remove(applicationId: string): void {
    const { [applicationId]: _, ...rest } = snapshot;
    snapshot = rest;
    persist();
    emit();
  },
};

export function useAdminEnrollmentPaidMonthsMap(): Record<string, AdminEnrollmentPaidMonthsRecord> {
  return useSyncExternalStore(
    adminEnrollmentPaidMonthsStore.subscribe,
    adminEnrollmentPaidMonthsStore.getSnapshot,
    adminEnrollmentPaidMonthsStore.getSnapshot,
  );
}
