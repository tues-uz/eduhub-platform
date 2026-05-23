import type { EnrollmentApplicationResponse, EnrollmentPaymentMethod } from "@/api/eduhubTypes";
import { DEFAULT_ENROLLMENT_PAYMENT_METHOD } from "@/features/enrollment/enrollmentDocumentConfig";

const STORAGE_KEY = "eduhub_enrollment_documents_v1";
const SEQ_KEY = "eduhub_enrollment_document_seq_v1";

export type StoredEnrollmentDocuments = {
  invoiceNumber: string;
  receiptNumber: string;
  paymentMethod: EnrollmentPaymentMethod;
  invoiceIssuedAt: string;
  receiptIssuedAt: string;
  amountPaid?: number;
  /** Demo-only flag when FE generated numbers. */
  isDemo?: boolean;
};

function loadMap(): Record<string, StoredEnrollmentDocuments> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, StoredEnrollmentDocuments>) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, StoredEnrollmentDocuments>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function nextSequence(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const n = raw ? Number(raw) : 0;
    const next = Number.isFinite(n) && n >= 0 ? n + 1 : 1;
    localStorage.setItem(SEQ_KEY, String(next));
    return next;
  } catch {
    return Math.floor(Date.now() % 10000);
  }
}

/** YYMM from date (e.g. Nov 2025 → 1125). */
export function documentPeriodCode(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatInvoiceNumber(period: string, seq: number): string {
  return `INV.EDUHUB.${period}-${String(seq).padStart(4, "0")}`;
}

export function formatReceiptNumber(period: string, seq: number): string {
  return `REC.EDUHUB.${period}-${String(seq).padStart(4, "0")}`;
}

export function allocateDemoEnrollmentDocuments(
  applicationId: string,
  issuedAtIso: string,
  amountPaid?: number,
  paymentMethod: EnrollmentPaymentMethod = DEFAULT_ENROLLMENT_PAYMENT_METHOD,
): StoredEnrollmentDocuments {
  const period = documentPeriodCode(issuedAtIso);
  const seq = nextSequence();
  const doc: StoredEnrollmentDocuments = {
    invoiceNumber: formatInvoiceNumber(period, seq),
    receiptNumber: formatReceiptNumber(period, seq),
    paymentMethod,
    invoiceIssuedAt: issuedAtIso,
    receiptIssuedAt: issuedAtIso,
    amountPaid,
    isDemo: true,
  };
  const map = loadMap();
  map[applicationId] = doc;
  saveMap(map);
  return doc;
}

export const enrollmentDocumentStore = {
  get(applicationId: string): StoredEnrollmentDocuments | undefined {
    return loadMap()[applicationId];
  },

  save(applicationId: string, doc: StoredEnrollmentDocuments) {
    const map = loadMap();
    map[applicationId] = doc;
    saveMap(map);
  },

  /** Persist API-issued numbers locally so GET /me without fields still works in mixed deployments. */
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
      isDemo: false,
    };
    saveMap(map);
  },
};
