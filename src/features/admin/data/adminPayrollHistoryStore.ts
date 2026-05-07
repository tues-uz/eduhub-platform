import { useSyncExternalStore } from "react";

const STORAGE_KEY = "eduhub.adminPayrollSubmissions.v1";

export const PAYROLL_SUBMISSIONS_CHANGE_EVENT = "eduhub-payroll-submissions-changed";

export type PayrollSubmissionRecord = {
  id: string;
  submittedAt: string;
  classSection: string;
  course: string;
  instructorName: string;
  /** When set, instructor notification was sent to this address. */
  instructorEmail?: string;
  /** Human-readable money summary */
  summary: string;
  notesPreview?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PAYROLL_SUBMISSIONS_CHANGE_EVENT));
  }
}

function load(): PayrollSubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is PayrollSubmissionRecord =>
        !!x &&
        typeof x === "object" &&
        typeof (x as PayrollSubmissionRecord).id === "string" &&
        typeof (x as PayrollSubmissionRecord).submittedAt === "string" &&
        typeof (x as PayrollSubmissionRecord).classSection === "string" &&
        typeof (x as PayrollSubmissionRecord).course === "string",
    );
  } catch {
    return [];
  }
}

function save(rows: PayrollSubmissionRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  emit();
}

let snapshot: PayrollSubmissionRecord[] = load();

function hydrate() {
  snapshot = load();
}

hydrate();

export const adminPayrollHistoryStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): PayrollSubmissionRecord[] {
    return snapshot;
  },

  /** Call when admin first approves / submits payout proof for a class section. */
  add(row: Omit<PayrollSubmissionRecord, "id" | "submittedAt">): PayrollSubmissionRecord {
    const rec: PayrollSubmissionRecord = {
      ...row,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };
    snapshot = [rec, ...snapshot].slice(0, 500);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      //
    }
    emit();
    return rec;
  },
};

export function usePayrollSubmissions(): PayrollSubmissionRecord[] {
  return useSyncExternalStore(
    adminPayrollHistoryStore.subscribe,
    adminPayrollHistoryStore.getSnapshot,
    adminPayrollHistoryStore.getSnapshot,
  );
}
