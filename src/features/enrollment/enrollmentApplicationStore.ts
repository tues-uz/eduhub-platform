/**
 * enrollmentApplicationStore.ts
 *
 * Enrollment application data store — API-first with localStorage as a short-lived cache.
 *
 * Architecture:
 * - All mutations go to the backend API first. localStorage is updated as a local cache
 *   so the UI can display optimistic state while navigating between pages.
 * - On app start, the backend is the authoritative source.
 * - If the API is unavailable, the cache allows degraded read-only access.
 * - Enrollment data submitted while unauthenticated falls back to localStorage-only
 *   until the user logs in, at which point the data should be re-submitted via the API.
 *
 * Key invariant: localStorage is NEVER the source of truth for APPROVED status.
 * isApprovedForCourse() should always be validated against the backend.
 */

import { eduhubEnrollmentApplications, eduhubAdminEnrollmentApplications, getAccessToken } from "@/api/eduhubClient";

const STORAGE_KEY = "eduhub_enrollment_applications_v1";

export type EnrollmentApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EnrollmentPaymentPlan = "FULL" | "DOWN_PAYMENT";

/** Payment schedule option chosen with down payment (1 / 2 / 4 / 6 / 8). */
export type EnrollmentInstallmentCount = 1 | 2 | 4 | 6 | 8;

export interface EnrollmentApplicationRecord {
  id: string;
  courseId: string;
  courseTitle?: string;
  applicantUserId?: string;
  applicantEmailNorm: string;
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  paymentProofUrl?: string;
  /** Government ID or student ID — optional on legacy stored rows. */
  idCardUrl?: string;
  paymentMethod?: string;
  /** Full tuition vs partial — omit on legacy stored rows (treated as full payment). */
  paymentPlan?: EnrollmentPaymentPlan;
  /** Amount student paid toward down payment; only when paymentPlan is DOWN_PAYMENT. */
  downPaymentAmount?: number;
  /** ISO currency code for formatting down payment (from course pricing at submit time). */
  priceCurrency?: string;
  /** Chosen when paymentPlan is DOWN_PAYMENT (1, 2, 4, 6, or 8). */
  installmentCount?: EnrollmentInstallmentCount;
  /** Referral code entered at enrollment (optional). */
  referralCode?: string;
  status: EnrollmentApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  invoiceIssuedAt?: string;
  receiptIssuedAt?: string;
  amountPaid?: number;
  /** True when this record was created locally (API call is pending/failed). */
  _localOnly?: boolean;
}

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("eduhub-enrollment-applications-changed"));
}

function readStorage(): EnrollmentApplicationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as EnrollmentApplicationRecord[];
  } catch {
    return [];
  }
}

function saveStorage(items: EnrollmentApplicationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    emitChanged();
  } catch (e) {
    console.warn("[EnrollmentStore] Could not save to localStorage", e);
  }
}

function findLatestForCourseAndEmailInner(
  courseId: string,
  emailNorm: string,
): EnrollmentApplicationRecord | undefined {
  const n = emailNorm.trim().toLowerCase();
  const matches = readStorage().filter((a) => a.courseId === courseId && a.applicantEmailNorm === n);
  if (matches.length === 0) return undefined;
  matches.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return matches[0];
}

export const enrollmentApplicationStore = {
  list(): EnrollmentApplicationRecord[] {
    return readStorage();
  },

  getById(id: string): EnrollmentApplicationRecord | undefined {
    return readStorage().find((a) => a.id === id);
  },

  findPendingForCourseAndEmail(courseId: string, emailNorm: string): EnrollmentApplicationRecord | undefined {
    const n = emailNorm.trim().toLowerCase();
    return readStorage().find(
      (a) => a.courseId === courseId && a.applicantEmailNorm === n && a.status === "PENDING",
    );
  },

  findLatestForCourseAndEmail(
    courseId: string,
    emailNorm: string,
  ): EnrollmentApplicationRecord | undefined {
    return findLatestForCourseAndEmailInner(courseId, emailNorm);
  },

  /**
   * Checks if the latest application is APPROVED.
   *
   * NOTE: This is a local-cache check only. Always validate against the backend
   * for security-sensitive decisions (e.g. granting course access).
   */
  isApprovedForCourse(courseId: string, emailNorm: string): boolean {
    return findLatestForCourseAndEmailInner(courseId, emailNorm)?.status === "APPROVED";
  },

  /**
   * Seeds local cache from API data (call on app boot or after login).
   * This replaces any locally-stored data with authoritative backend data.
   */
  syncFromApi(records: EnrollmentApplicationRecord[]): void {
    saveStorage(records);
  },

  /**
   * Submits an enrollment application.
   *
   * API-first: the application is sent to the backend. If the user is
   * unauthenticated, or the API call fails, the record is cached locally
   * and flagged as `_localOnly: true` so callers can warn the user.
   */
  async add(input: {
    courseId: string;
    courseTitle?: string;
    applicantUserId?: string;
    applicantEmailNorm: string;
    fullName: string;
    email: string;
    phone: string;
    phoneSecondary?: string;
    address: string;
    paymentProofUrl?: string;
    idCardUrl?: string;
    paymentMethod?: string;
    paymentPlan: EnrollmentPaymentPlan;
    downPaymentAmount?: number;
    priceCurrency?: string;
    installmentCount?: EnrollmentInstallmentCount;
    referralCode?: string;
  }): Promise<EnrollmentApplicationRecord> {
    const localRec: EnrollmentApplicationRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: "PENDING",
      submittedAt: new Date().toISOString(),
      _localOnly: true,
    };

    if (getAccessToken() && input.courseId.trim()) {
      try {
        const apiResult = await eduhubEnrollmentApplications.submit({
          courseId: input.courseId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          paymentProofUrl: input.paymentProofUrl,
          idCardUrl: input.idCardUrl,
          paymentMethod: input.paymentMethod as any,
          paymentPlan: input.paymentPlan,
          downPaymentAmount: input.downPaymentAmount,
          installmentCount: input.installmentCount,
        });
        // API succeeded — use the API-generated ID and store as confirmed
        const confirmed: EnrollmentApplicationRecord = {
          ...localRec,
          id: (apiResult as any)?.id ?? localRec.id,
          _localOnly: false,
        };
        const all = readStorage();
        all.push(confirmed);
        saveStorage(all);
        return confirmed;
      } catch (err) {
        console.warn("[EnrollmentStore] API submission failed — caching locally only", err);
        // Fall through to local-only save below
      }
    }

    // Unauthenticated or API error — cache locally with warning flag
    const all = readStorage();
    all.push(localRec);
    saveStorage(all);
    return localRec;
  },

  update(
    id: string,
    patch: Partial<
      Pick<
        EnrollmentApplicationRecord,
        | "status"
        | "reviewedAt"
        | "adminNote"
        | "paymentProofUrl"
        | "invoiceNumber"
        | "receiptNumber"
        | "paymentMethod"
        | "invoiceIssuedAt"
        | "receiptIssuedAt"
        | "amountPaid"
      >
    >,
  ): void {
    const all = readStorage();
    const i = all.findIndex((a) => a.id === id);
    if (i === -1) return;
    all[i] = { ...all[i], ...patch };
    saveStorage(all);

    if (getAccessToken() && id.trim() && patch.status) {
      if (patch.status === "APPROVED") {
        void eduhubAdminEnrollmentApplications.approve(id, { adminNote: patch.adminNote }).catch((err) => {
          console.warn("[EnrollmentStore] Backend approval sync failed", err);
        });
      } else if (patch.status === "REJECTED") {
        void eduhubAdminEnrollmentApplications.reject(id, { adminNote: patch.adminNote }).catch((err) => {
          console.warn("[EnrollmentStore] Backend rejection sync failed", err);
        });
      }
    }
  },

  /**
   * DEV ONLY — clears local cache. Never called in production.
   */
  resetToDevDummy(): void {
    if (!import.meta.env.DEV) return;
    localStorage.removeItem(STORAGE_KEY);
    emitChanged();
  },
};
