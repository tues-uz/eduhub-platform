import { useSyncExternalStore, useEffect } from "react";
import { eduhubAdminPayments, eduhubAdminInstallmentPayments } from "@/api/eduhubClient";
import type { AdminPaymentRow, PaymentStatus } from "@/api/eduhubTypes";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

let cachedSnapshot: AdminPaymentRow[] = [];
let isFetching = false;

async function fetchFromApi(): Promise<AdminPaymentRow[]> {
  if (isFetching) return cachedSnapshot;
  isFetching = true;
  try {
    const data = await eduhubAdminPayments.listAll();
    cachedSnapshot = data || [];
    emit();
  } catch (e) {
    console.warn("Failed to fetch admin payments from API", e);
  } finally {
    isFetching = false;
  }
  return cachedSnapshot;
}

export const adminPaymentsStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): AdminPaymentRow[] {
    return cachedSnapshot;
  },

  refresh(): Promise<AdminPaymentRow[]> {
    return fetchFromApi();
  },

  setAll(next: AdminPaymentRow[]): void {
    cachedSnapshot = [...next];
    emit();
  },

  updatePayment(id: string, patch: Partial<AdminPaymentRow>): void {
    cachedSnapshot = cachedSnapshot.map((p) => (p.id === id ? { ...p, ...patch } : p));
    emit();

    if (patch.status === "paid") {
      void eduhubAdminInstallmentPayments.approve(id).catch(() => {});
    } else if (patch.status === "overdue") {
      void eduhubAdminInstallmentPayments.reject(id).catch(() => {});
    }
  },
};

export function useAdminPayments(): AdminPaymentRow[] {
  useEffect(() => {
    void adminPaymentsStore.refresh();
  }, []);

  return useSyncExternalStore(
    adminPaymentsStore.subscribe,
    adminPaymentsStore.getSnapshot,
    adminPaymentsStore.getSnapshot,
  );
}
