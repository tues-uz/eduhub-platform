import { useSyncExternalStore } from "react";
import {
  notifyAdminInstructorPayrollRequest,
  notifyInstructorPayrollRequestDecision,
} from "@/features/notifications/appNotificationStore";

const STORAGE_KEY = "eduhub.instructorPayrollRequests.v1";

export const INSTRUCTOR_PAYROLL_REQUESTS_EVENT = "eduhub-instructor-payroll-requests-changed";

export type InstructorPayrollRequestStatus = "pending" | "approved" | "rejected";

export type InstructorPayrollRequestRecord = {
  id: string;
  submittedAt: string;
  classSection: string;
  course: string;
  instructorName: string;
  /** Normalized email; may be empty if profile has no email (demo). */
  instructorEmailNorm: string;
  /** Optional period label entered by instructor, e.g. "Apr 2026". */
  periodLabel: string;
  /** Optional session count (freeform) entered by instructor, e.g. "8/9". */
  sessionsTaught: string;
  /** Requested payout (freeform), e.g. "2,100,000 UZS". */
  requestedPayout: string;
  /** Optional bank reference / method, freeform. */
  payoutDetails: string;
  /** Snapshot of totals at submission time */
  summary: string;
  instructorNotes: string;
  status: InstructorPayrollRequestStatus;
  resolvedAt?: string;
  adminNote?: string;
  /** Short admin identifier for audit trail (e.g. AF01). */
  reviewedByCode?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INSTRUCTOR_PAYROLL_REQUESTS_EVENT));
  }
}

function normalizeInstructorKey(emailNorm: string, instructorName: string) {
  const e = emailNorm.trim().toLowerCase();
  if (e) return `e:${e}`;
  return `n:${instructorName.trim().toLowerCase()}`;
}

export function instructorPayrollRequestDedupeKey(
  classSection: string,
  course: string,
  instructorEmailNorm: string,
  instructorName: string,
) {
  return `${classSection.trim()}\t${course.trim()}\t${normalizeInstructorKey(instructorEmailNorm, instructorName)}`;
}

function load(): InstructorPayrollRequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is InstructorPayrollRequestRecord => {
      if (!x || typeof x !== "object") return false;
      const r = x as InstructorPayrollRequestRecord;
      const okStatus = r.status === "pending" || r.status === "approved" || r.status === "rejected";
      return (
        typeof r.id === "string" &&
        typeof r.submittedAt === "string" &&
        typeof r.classSection === "string" &&
        typeof r.course === "string" &&
        typeof r.instructorName === "string" &&
        typeof r.instructorEmailNorm === "string" &&
        typeof (r.periodLabel ?? "") === "string" &&
        typeof (r.sessionsTaught ?? "") === "string" &&
        typeof (r.requestedPayout ?? "") === "string" &&
        typeof (r.payoutDetails ?? "") === "string" &&
        typeof r.summary === "string" &&
        typeof r.instructorNotes === "string" &&
        okStatus
      );
    });
  } catch {
    return [];
  }
}

function save(rows: InstructorPayrollRequestRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  emit();
}

let snapshot: InstructorPayrollRequestRecord[] = load();

function hydrate() {
  snapshot = load();
}

hydrate();

export const instructorPayrollRequestStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): InstructorPayrollRequestRecord[] {
    return snapshot;
  },

  listPending(): InstructorPayrollRequestRecord[] {
    return snapshot.filter((r) => r.status === "pending");
  },

  listForInstructor(emailNorm: string, instructorName: string): InstructorPayrollRequestRecord[] {
    const e = emailNorm.trim().toLowerCase();
    const n = instructorName.trim().toLowerCase();
    return snapshot.filter((r) => {
      const re = r.instructorEmailNorm.trim().toLowerCase();
      if (e && re && re === e) return true;
      if (!re && r.instructorName.trim().toLowerCase() === n && n.length > 0) return true;
      return false;
    });
  },

  submit(opts: {
    classSection: string;
    course: string;
    instructorName: string;
    instructorEmailNorm: string;
    periodLabel: string;
    sessionsTaught: string;
    requestedPayout: string;
    payoutDetails: string;
    summary: string;
    instructorNotes: string;
  }): { ok: true; record: InstructorPayrollRequestRecord } | { ok: false; reason: string } {
    const key = instructorPayrollRequestDedupeKey(
      opts.classSection,
      opts.course,
      opts.instructorEmailNorm,
      opts.instructorName,
    );
    const hasPending = snapshot.some((r) => r.status === "pending" && instructorPayrollRequestDedupeKey(
      r.classSection,
      r.course,
      r.instructorEmailNorm,
      r.instructorName,
    ) === key);
    if (hasPending) {
      return { ok: false, reason: "You already have a pending request for this class." };
    }

    const record: InstructorPayrollRequestRecord = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      classSection: opts.classSection.trim(),
      course: opts.course.trim(),
      instructorName: opts.instructorName.trim(),
      instructorEmailNorm: opts.instructorEmailNorm.trim().toLowerCase(),
      periodLabel: opts.periodLabel.trim(),
      sessionsTaught: opts.sessionsTaught.trim(),
      requestedPayout: opts.requestedPayout.trim(),
      payoutDetails: opts.payoutDetails.trim(),
      summary: opts.summary.trim(),
      instructorNotes: opts.instructorNotes.trim(),
      status: "pending",
    };
    snapshot = [record, ...snapshot].slice(0, 500);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      //
    }
    emit();

    notifyAdminInstructorPayrollRequest({
      instructorName: record.instructorName,
      classSection: record.classSection,
      course: record.course,
      periodLabel: record.periodLabel || undefined,
      sessionsTaught: record.sessionsTaught || undefined,
      requestedPayout: record.requestedPayout || undefined,
      payoutDetails: record.payoutDetails || undefined,
      summary: record.summary,
      instructorNotes: record.instructorNotes || undefined,
    });

    return { ok: true, record };
  },

  approve(id: string, adminActionCode: string): boolean {
    const i = snapshot.findIndex((r) => r.id === id && r.status === "pending");
    if (i === -1) return false;
    const resolvedAt = new Date().toISOString();
    const code = adminActionCode.trim().toUpperCase();
    snapshot = snapshot.map((r) =>
      r.id === id ? { ...r, status: "approved" as const, resolvedAt, reviewedByCode: code } : r,
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      //
    }
    emit();
    const r = snapshot.find((x) => x.id === id);
    if (r) {
      notifyInstructorPayrollRequestDecision({
        instructorEmailNorm: r.instructorEmailNorm,
        instructorName: r.instructorName,
        classSection: r.classSection,
        course: r.course,
        decision: "approved",
      });
    }
    return true;
  },

  reject(id: string, adminActionCode: string, adminNote?: string): boolean {
    const i = snapshot.findIndex((r) => r.id === id && r.status === "pending");
    if (i === -1) return false;
    const resolvedAt = new Date().toISOString();
    const note = adminNote?.trim() || undefined;
    const code = adminActionCode.trim().toUpperCase();
    snapshot = snapshot.map((r) =>
      r.id === id ? { ...r, status: "rejected" as const, resolvedAt, adminNote: note, reviewedByCode: code } : r,
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      //
    }
    emit();
    const r = snapshot.find((x) => x.id === id);
    if (r) {
      notifyInstructorPayrollRequestDecision({
        instructorEmailNorm: r.instructorEmailNorm,
        instructorName: r.instructorName,
        classSection: r.classSection,
        course: r.course,
        decision: "rejected",
        adminNote: note,
      });
    }
    return true;
  },
};

export function useInstructorPayrollRequests(): InstructorPayrollRequestRecord[] {
  return useSyncExternalStore(
    instructorPayrollRequestStore.subscribe,
    instructorPayrollRequestStore.getSnapshot,
    instructorPayrollRequestStore.getSnapshot,
  );
}
