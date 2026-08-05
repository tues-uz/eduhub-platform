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

function load(): EnrollmentApplicationRecord[] {
  return readStorage();
}

function save(items: EnrollmentApplicationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChanged();
}

function findLatestForCourseAndEmailInner(
  courseId: string,
  emailNorm: string,
): EnrollmentApplicationRecord | undefined {
  const n = emailNorm.trim().toLowerCase();
  const matches = load().filter((a) => a.courseId === courseId && a.applicantEmailNorm === n);
  if (matches.length === 0) return undefined;
  matches.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return matches[0];
}

export const enrollmentApplicationStore = {
  list(): EnrollmentApplicationRecord[] {
    return load();
  },

  getById(id: string): EnrollmentApplicationRecord | undefined {
    return load().find((a) => a.id === id);
  },

  findPendingForCourseAndEmail(courseId: string, emailNorm: string): EnrollmentApplicationRecord | undefined {
    const n = emailNorm.trim().toLowerCase();
    return load().find(
      (a) => a.courseId === courseId && a.applicantEmailNorm === n && a.status === "PENDING",
    );
  },

  findLatestForCourseAndEmail(
    courseId: string,
    emailNorm: string,
  ): EnrollmentApplicationRecord | undefined {
    return findLatestForCourseAndEmailInner(courseId, emailNorm);
  },

  /** Latest application must be APPROVED — local fallback while backend admin-approval sync lags. */
  isApprovedForCourse(courseId: string, emailNorm: string): boolean {
    return findLatestForCourseAndEmailInner(courseId, emailNorm)?.status === "APPROVED";
  },

  resetToDevDummy(): void {
    if (!import.meta.env.DEV) return;
    localStorage.removeItem(STORAGE_KEY);
    emitChanged();
  },

  add(input: {
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
  }): EnrollmentApplicationRecord {
    const rec: EnrollmentApplicationRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: "PENDING",
      submittedAt: new Date().toISOString(),
    };
    const all = load();
    all.push(rec);
    save(all);

    if (getAccessToken() && input.courseId.trim()) {
      void eduhubEnrollmentApplications
        .submit({
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
        })
        .catch((err) => {
          console.warn("[EnrollmentStore] Backend API sync failed, saved locally", err);
        });
    }

    return rec;
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
    const all = load();
    const i = all.findIndex((a) => a.id === id);
    if (i === -1) return;
    all[i] = { ...all[i], ...patch };
    save(all);

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
};
