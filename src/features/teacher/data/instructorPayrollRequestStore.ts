import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import { eduhubPayroll } from "@/api/eduhubClient";
import type { PayrollRequestResponse } from "@/api/eduhubTypes";
import { parsePayrollPeriodYearMonth } from "@/features/payroll/payrollScheduleEligibility";

export const INSTRUCTOR_PAYROLL_REQUESTS_EVENT = "eduhub-instructor-payroll-requests-changed";

export type InstructorPayrollRequestStatus = "pending" | "approved" | "rejected";

export type InstructorPayrollRequestRecord = {
  id: string;
  submittedAt: string;
  courseId?: string;
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

let snapshot: InstructorPayrollRequestRecord[] = [];
let loadingPromise: Promise<void> | null = null;

function fromApi(r: PayrollRequestResponse): InstructorPayrollRequestRecord {
  return {
    id: r.id,
    submittedAt: r.submittedAt,
    courseId: r.courseId,
    classSection: r.classSection,
    course: r.course,
    instructorName: r.instructorName,
    instructorEmailNorm: r.instructorEmailNorm,
    periodLabel: r.periodLabel,
    sessionsTaught: r.sessionsTaught,
    requestedPayout: r.requestedPayout,
    payoutDetails: r.payoutDetails,
    summary: r.summary,
    instructorNotes: r.instructorNotes,
    status: r.status,
    resolvedAt: r.resolvedAt,
    adminNote: r.adminNote,
    reviewedByCode: r.reviewedByCode,
  };
}

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

  load(): Promise<void> {
    if (loadingPromise) return loadingPromise;
    loadingPromise = eduhubPayroll
      .listRequests()
      .then((rows) => {
        snapshot = (rows ?? []).map(fromApi);
        emit();
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  },

  async submit(opts: {
    courseId: string;
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
  }): Promise<{ ok: true; record: InstructorPayrollRequestRecord } | { ok: false; reason: string }> {
    const classKey = instructorPayrollRequestDedupeKey(
      opts.classSection,
      opts.course,
      opts.instructorEmailNorm,
      opts.instructorName,
    );
    const periodYm = parsePayrollPeriodYearMonth(opts.periodLabel, new Date().toISOString());
    const alreadySubmitted = snapshot.some((r) => {
      if (instructorPayrollRequestDedupeKey(r.classSection, r.course, r.instructorEmailNorm, r.instructorName) !== classKey) {
        return false;
      }
      if (r.status === "rejected") return false;
      if (periodYm) {
        return parsePayrollPeriodYearMonth(r.periodLabel, r.submittedAt) === periodYm;
      }
      return r.status === "pending";
    });
    if (alreadySubmitted) {
      return {
        ok: false,
        reason: periodYm
          ? `Payroll for ${opts.periodLabel.trim()} was already submitted for this class.`
          : "You already have a pending request for this class.",
      };
    }

    try {
      const api = await eduhubPayroll.submitRequest({
        courseId: opts.courseId,
        period: periodYm ?? undefined,
        periodLabel: opts.periodLabel.trim(),
        sessionsTaught: opts.sessionsTaught.trim(),
        requestedPayout: opts.requestedPayout.trim(),
        currency: opts.requestedPayout.trim().split(/\s+/).pop() || "UZS",
        payoutDetails: opts.payoutDetails.trim(),
        summary: opts.summary.trim(),
        instructorNotes: opts.instructorNotes.trim(),
      });
      const record = fromApi(api);
      snapshot = [record, ...snapshot.filter((r) => r.id !== record.id)].slice(0, 500);
      emit();
      return { ok: true, record };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "Please try again." };
    }
  },

  async approve(id: string, adminActionCode: string): Promise<boolean> {
    try {
      const api = await eduhubPayroll.approveRequest(id, { adminActionCode: adminActionCode.trim().toUpperCase() });
      const record = fromApi(api);
      snapshot = snapshot.map((r) => (r.id === id ? record : r));
      emit();
      return true;
    } catch {
      return false;
    }
  },

  async reject(id: string, adminActionCode: string, adminNote?: string): Promise<boolean> {
    try {
      const api = await eduhubPayroll.rejectRequest(id, {
        adminActionCode: adminActionCode.trim().toUpperCase(),
        adminNote: adminNote?.trim() || undefined,
      });
      const record = fromApi(api);
      snapshot = snapshot.map((r) => (r.id === id ? record : r));
      emit();
      return true;
    } catch {
      return false;
    }
  },
};

export function useInstructorPayrollRequests(): InstructorPayrollRequestRecord[] {
  useEffect(() => {
    void instructorPayrollRequestStore.load();
  }, []);
  return useSyncExternalStore(
    instructorPayrollRequestStore.subscribe,
    instructorPayrollRequestStore.getSnapshot,
    instructorPayrollRequestStore.getSnapshot,
  );
}
