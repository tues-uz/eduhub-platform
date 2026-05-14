import { useSyncExternalStore } from "react";
import {
  mockAdminPayments,
  type AdminPaymentRow,
  type PaymentStatus,
} from "@/features/admin/data/adminOperationalMock";

const STORAGE_KEY = "eduhub.adminPayments.v2";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function normalizePaymentStatus(s: unknown): PaymentStatus {
  if (s === "paid" || s === "pending" || s === "overdue") return s;
  return "pending";
}

function parseStored(raw: string | null): AdminPaymentRow[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: AdminPaymentRow[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string") continue;
      out.push({
        id: r.id,
        className: typeof r.className === "string" ? r.className : "",
        studentName: typeof r.studentName === "string" ? r.studentName : "",
        studentEmail: typeof r.studentEmail === "string" ? r.studentEmail : "",
        course: typeof r.course === "string" ? r.course : "",
        lecturerName: typeof r.lecturerName === "string" ? r.lecturerName : "",
        lecturerEmail: typeof r.lecturerEmail === "string" ? r.lecturerEmail : undefined,
        amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0,
        currency: typeof r.currency === "string" ? r.currency : "UZS",
        dueDate: typeof r.dueDate === "string" ? r.dueDate : "",
        status: normalizePaymentStatus(r.status),
        proofSubmitted: !!r.proofSubmitted,
        reference: typeof r.reference === "string" ? r.reference : "",
        paymentMethod: typeof r.paymentMethod === "string" ? r.paymentMethod : "",
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
        paidAt: typeof r.paidAt === "string" ? r.paidAt : undefined,
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Keeps a stable array reference until `setAll` / `updatePayment` / `resetToMock`. */
let cachedSnapshot: AdminPaymentRow[] = [];

function seedFromMock(): void {
  cachedSnapshot = mockAdminPayments.map((p) => ({ ...p }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSnapshot));
  } catch {
    // ignore quota / private mode
  }
}

function loadIntoCache(): void {
  let fromDisk: AdminPaymentRow[] | null = null;
  try {
    fromDisk = parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    fromDisk = null;
  }
  if (fromDisk && fromDisk.length > 0) {
    cachedSnapshot = fromDisk;
    return;
  }
  seedFromMock();
}

loadIntoCache();

export const adminPaymentsStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): AdminPaymentRow[] {
    return cachedSnapshot;
  },

  setAll(next: AdminPaymentRow[]): void {
    cachedSnapshot = next.map((p) => ({ ...p }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSnapshot));
    } catch {
      //
    }
    emit();
  },

  updatePayment(id: string, patch: Partial<AdminPaymentRow>): void {
    cachedSnapshot = cachedSnapshot.map((p) => (p.id === id ? { ...p, ...patch } : p));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSnapshot));
    } catch {
      //
    }
    emit();
  },

  resetToMock(): void {
    seedFromMock();
    emit();
  },
};

export function useAdminPayments(): AdminPaymentRow[] {
  return useSyncExternalStore(
    adminPaymentsStore.subscribe,
    adminPaymentsStore.getSnapshot,
    adminPaymentsStore.getSnapshot,
  );
}
