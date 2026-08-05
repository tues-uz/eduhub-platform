import { useSyncExternalStore } from "react";

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

let snapshot: PayrollSubmissionRecord[] = [];

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

