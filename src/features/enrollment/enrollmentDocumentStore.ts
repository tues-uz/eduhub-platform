import type { EnrollmentApplicationResponse, EnrollmentPaymentMethod } from "@/api/eduhubTypes";
import { DEFAULT_ENROLLMENT_PAYMENT_METHOD } from "@/features/enrollment/enrollmentDocumentConfig";

export type StoredEnrollmentDocuments = {
  invoiceNumber: string;
  receiptNumber: string;
  paymentMethod: EnrollmentPaymentMethod;
  invoiceIssuedAt: string;
  receiptIssuedAt: string;
  amountPaid?: number;
};

let memoryDocumentMap: Record<string, StoredEnrollmentDocuments> = {};

function loadMap(): Record<string, StoredEnrollmentDocuments> {
  return memoryDocumentMap;
}

function saveMap(map: Record<string, StoredEnrollmentDocuments>) {
  memoryDocumentMap = map;
}

export const enrollmentDocumentStore = {
  get(applicationId: string): StoredEnrollmentDocuments | undefined {
    return loadMap()[applicationId];
  },

  /** Cache the backend-issued invoice/receipt numbers so repeat lookups don't need a fresh GET. */
  syncFromApi(applicationId: string, app: EnrollmentApplicationResponse) {
    if (!app.invoiceNumber || !app.receiptNumber) return;
    const map = loadMap();
    map[applicationId] = {
      invoiceNumber: app.invoiceNumber,
      receiptNumber: app.receiptNumber,
      paymentMethod: app.paymentMethod ?? DEFAULT_ENROLLMENT_PAYMENT_METHOD,
      invoiceIssuedAt: app.invoiceIssuedAt ?? app.reviewedAt ?? new Date().toISOString(),
      receiptIssuedAt: app.receiptIssuedAt ?? app.reviewedAt ?? new Date().toISOString(),
      amountPaid: app.amountPaid,
    };
    saveMap(map);
  },
};
