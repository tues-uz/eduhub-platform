import { useSyncExternalStore } from "react";
import type { EnrollmentPaymentMethod } from "@/features/enrollment/enrollmentDocumentConfig";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";

const STORAGE_KEY = "eduhub.enrollmentInstallmentPayments.v1";
export const ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED = "eduhub-enrollment-installment-payments-changed";

export type InstallmentPaymentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EnrollmentInstallmentPayment = {
  id: string;
  enrollmentApplicationId: string;
  courseId: string;
  courseTitle: string;
  studentEmailNorm: string;
  studentName: string;
  scheduleMonth: TuitionPlanMonths;
  scheduleMonthLabel: string;
  amount: number;
  currency: string;
  paymentMethod: EnrollmentPaymentMethod;
  paymentProofUrl?: string;
  status: InstallmentPaymentStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
  reviewedByCode?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED));
  }
}

let snapshot: EnrollmentInstallmentPayment[] = [];

function parseStored(raw: string | null): EnrollmentInstallmentPayment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is EnrollmentInstallmentPayment => {
      if (!row || typeof row !== "object") return false;
      const r = row as Record<string, unknown>;
      return (
        typeof r.id === "string" &&
        typeof r.enrollmentApplicationId === "string" &&
        typeof r.courseId === "string" &&
        (r.scheduleMonth === 1 || r.scheduleMonth === 2 || r.scheduleMonth === 3) &&
        typeof r.amount === "number" &&
        (r.status === "PENDING" || r.status === "APPROVED" || r.status === "REJECTED")
      );
    });
  } catch {
    return [];
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

function newId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const enrollmentInstallmentPaymentStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): EnrollmentInstallmentPayment[] {
    return snapshot;
  },

  listForApplication(applicationId: string): EnrollmentInstallmentPayment[] {
    return snapshot.filter((r) => r.enrollmentApplicationId === applicationId);
  },

  listForStudent(emailNorm: string): EnrollmentInstallmentPayment[] {
    const norm = emailNorm.trim().toLowerCase();
    return snapshot.filter((r) => r.studentEmailNorm === norm);
  },

  findPendingForMonth(
    applicationId: string,
    month: TuitionPlanMonths,
  ): EnrollmentInstallmentPayment | undefined {
    return snapshot.find(
      (r) =>
        r.enrollmentApplicationId === applicationId &&
        r.scheduleMonth === month &&
        r.status === "PENDING",
    );
  },

  submit(input: Omit<EnrollmentInstallmentPayment, "id" | "status" | "submittedAt">): EnrollmentInstallmentPayment {
    const existingPending = enrollmentInstallmentPaymentStore.findPendingForMonth(
      input.enrollmentApplicationId,
      input.scheduleMonth,
    );
    if (existingPending) {
      throw new Error("A payment for this schedule month is already awaiting review.");
    }
    const row: EnrollmentInstallmentPayment = {
      ...input,
      id: newId(),
      status: "PENDING",
      submittedAt: new Date().toISOString(),
    };
    snapshot = [row, ...snapshot];
    persist();
    emit();
    return row;
  },

  update(
    id: string,
    patch: Partial<Pick<EnrollmentInstallmentPayment, "status" | "reviewedAt" | "adminNote" | "reviewedByCode">>,
  ): EnrollmentInstallmentPayment | null {
    const idx = snapshot.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const next = { ...snapshot[idx]!, ...patch };
    snapshot = [...snapshot.slice(0, idx), next, ...snapshot.slice(idx + 1)];
    persist();
    emit();
    return next;
  },
};

export function useEnrollmentInstallmentPayments(): EnrollmentInstallmentPayment[] {
  return useSyncExternalStore(
    enrollmentInstallmentPaymentStore.subscribe,
    enrollmentInstallmentPaymentStore.getSnapshot,
    enrollmentInstallmentPaymentStore.getSnapshot,
  );
}
