import { useCallback, useEffect, useSyncExternalStore } from "react";
import { eduhubAdminInstallmentPayments, eduhubInstallmentPayments } from "@/api/eduhubClient";
import type {
  InstallmentPaymentResponse,
  InstallmentPaymentReviewRequest,
  InstallmentPaymentSubmitRequest,
} from "@/api/eduhubTypes";

export const ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED = "eduhub-enrollment-installment-payments-changed";

export type InstallmentPaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type EnrollmentInstallmentPayment = InstallmentPaymentResponse;

const EMPTY: EnrollmentInstallmentPayment[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED));
  }
}

const byApplication = new Map<string, EnrollmentInstallmentPayment[]>();
const applicationFetches = new Map<string, Promise<void>>();
let allPayments: EnrollmentInstallmentPayment[] = EMPTY;
let allFetch: Promise<void> | null = null;

function mergeIntoAll(payments: EnrollmentInstallmentPayment[]) {
  const byId = new Map(allPayments.map((p) => [p.id, p]));
  for (const p of payments) byId.set(p.id, p);
  allPayments = [...byId.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

async function fetchApplication(applicationId: string): Promise<void> {
  const payments = await eduhubInstallmentPayments.listForApplication(applicationId);
  byApplication.set(applicationId, payments);
  mergeIntoAll(payments);
  emit();
}

async function fetchAll(): Promise<void> {
  const payments = await eduhubAdminInstallmentPayments.listAll();
  allPayments = [...payments].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  for (const p of payments) {
    const existing = byApplication.get(p.enrollmentApplicationId);
    if (!existing) {
      byApplication.set(p.enrollmentApplicationId, [p]);
    } else if (!existing.some((e) => e.id === p.id)) {
      byApplication.set(p.enrollmentApplicationId, [...existing, p]);
    }
  }
  emit();
}

function ensureApplicationLoaded(applicationId: string): void {
  if (applicationFetches.has(applicationId)) return;
  applicationFetches.set(
    applicationId,
    fetchApplication(applicationId).catch(() => {
      applicationFetches.delete(applicationId);
    }),
  );
}

function ensureAllLoaded(): void {
  if (allFetch) return;
  allFetch = fetchAll().catch(() => {
    allFetch = null;
  });
}

export const enrollmentInstallmentPaymentStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): EnrollmentInstallmentPayment[] {
    ensureAllLoaded();
    return allPayments;
  },

  listForApplication(applicationId: string): EnrollmentInstallmentPayment[] {
    ensureApplicationLoaded(applicationId);
    return byApplication.get(applicationId) ?? EMPTY;
  },

  findPendingForMonth(
    applicationId: string,
    month: 1 | 2 | 3,
  ): EnrollmentInstallmentPayment | undefined {
    return enrollmentInstallmentPaymentStore
      .listForApplication(applicationId)
      .find((r) => r.scheduleMonth === month && r.status === "PENDING");
  },

  async refreshApplication(applicationId: string): Promise<void> {
    applicationFetches.delete(applicationId);
    await fetchApplication(applicationId);
  },

  async refreshAll(): Promise<void> {
    allFetch = null;
    await fetchAll();
  },

  async submit(
    applicationId: string,
    body: InstallmentPaymentSubmitRequest,
  ): Promise<EnrollmentInstallmentPayment> {
    const created = await eduhubInstallmentPayments.submit(applicationId, body);
    await enrollmentInstallmentPaymentStore.refreshApplication(applicationId);
    return created;
  },

  async approve(
    id: string,
    applicationId: string,
    body?: InstallmentPaymentReviewRequest,
  ): Promise<EnrollmentInstallmentPayment> {
    const updated = await eduhubAdminInstallmentPayments.approve(id, body);
    await Promise.all([
      enrollmentInstallmentPaymentStore.refreshApplication(applicationId),
      enrollmentInstallmentPaymentStore.refreshAll(),
    ]);
    return updated;
  },

  async reject(
    id: string,
    applicationId: string,
    body?: InstallmentPaymentReviewRequest,
  ): Promise<EnrollmentInstallmentPayment> {
    const updated = await eduhubAdminInstallmentPayments.reject(id, body);
    await Promise.all([
      enrollmentInstallmentPaymentStore.refreshApplication(applicationId),
      enrollmentInstallmentPaymentStore.refreshAll(),
    ]);
    return updated;
  },
};

export function useEnrollmentInstallmentPayments(): EnrollmentInstallmentPayment[] {
  return useSyncExternalStore(
    enrollmentInstallmentPaymentStore.subscribe,
    enrollmentInstallmentPaymentStore.getSnapshot,
    enrollmentInstallmentPaymentStore.getSnapshot,
  );
}

export function useInstallmentPaymentsForApplication(
  applicationId: string | undefined,
): EnrollmentInstallmentPayment[] {
  useEffect(() => {
    if (applicationId) void enrollmentInstallmentPaymentStore.refreshApplication(applicationId);
  }, [applicationId]);

  const getSnapshot = useCallback(
    () => (applicationId ? enrollmentInstallmentPaymentStore.listForApplication(applicationId) : EMPTY),
    [applicationId],
  );
  return useSyncExternalStore(enrollmentInstallmentPaymentStore.subscribe, getSnapshot, getSnapshot);
}
