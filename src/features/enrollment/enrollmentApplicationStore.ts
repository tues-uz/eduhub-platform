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

const PLACEHOLDER_PROOF = "local://eduhub-enrollment/payment-proof";
const PLACEHOLDER_ID = "local://eduhub-enrollment/id-document";

/** Sample rows for dev so Admin → Enrollment applications is populated without a student submit. */
const DUMMY_ENROLLMENT_APPLICATIONS: EnrollmentApplicationRecord[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    courseId: "00000000-0000-0000-0000-00000000aa00",
    courseTitle: "Demo: Server course (pending review)",
    applicantEmailNorm: "alex.demo@example.com",
    fullName: "Alex Demo",
    email: "alex.demo@example.com",
    phone: "+998 90 111 2233",
    phoneSecondary: "+998 71 222 3344",
    address: "12 Amir Temur Ave, Tashkent",
    paymentProofUrl: PLACEHOLDER_PROOF,
    idCardUrl: PLACEHOLDER_ID,
    paymentPlan: "FULL",
    status: "PENDING",
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    courseId: "00000000-0000-0000-0000-00000000aa01",
    courseTitle: "Demo: Server course (full payment)",
    applicantEmailNorm: "sam.student@example.com",
    fullName: "Sam Student",
    email: "sam.student@example.com",
    phone: "+998 90 444 5566",
    address: "45 Navoi Street, Samarkand",
    paymentProofUrl: PLACEHOLDER_PROOF,
    idCardUrl: PLACEHOLDER_ID,
    paymentPlan: "FULL",
    status: "PENDING",
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    courseId: "00000000-0000-0000-0000-00000000aa02",
    courseTitle: "Demo: Down payment plan",
    applicantEmailNorm: "jamila.k@example.com",
    fullName: "Jamila Karimova",
    email: "jamila.k@example.com",
    phone: "+998 93 777 8899",
    address: "Unit 3, Bukhara Road 18",
    paymentProofUrl: PLACEHOLDER_PROOF,
    idCardUrl: PLACEHOLDER_ID,
    paymentPlan: "DOWN_PAYMENT",
    downPaymentAmount: 150_000,
    priceCurrency: "UZS",
    installmentCount: 4,
    status: "PENDING",
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    courseId: "00000000-0000-0000-0000-00000000aa03",
    courseTitle: "Demo: Already reviewed",
    applicantEmailNorm: "lee.past@example.com",
    fullName: "Lee Past",
    email: "lee.past@example.com",
    phone: "+998 94 000 1122",
    address: "99 Yangier St",
    paymentProofUrl: PLACEHOLDER_PROOF,
    idCardUrl: PLACEHOLDER_ID,
    paymentPlan: "FULL",
    status: "APPROVED",
    submittedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    courseId: "00000000-0000-0000-0000-00000000aa04",
    courseTitle: "Demo: Rejected example",
    applicantEmailNorm: "no.proof@example.com",
    fullName: "Incomplete Proof",
    email: "no.proof@example.com",
    phone: "+998 95 333 4455",
    address: "—",
    paymentProofUrl: PLACEHOLDER_PROOF,
    idCardUrl: PLACEHOLDER_ID,
    paymentPlan: "FULL",
    status: "REJECTED",
    submittedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    adminNote: "Payment screenshot did not match reference amount. Please resubmit.",
  },
];

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

/** In dev only: if there are no rows yet, seed dummy applications once so the admin UI can be exercised. */
function seedDevDummyIfNeeded(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  if (readStorage().length > 0) return;
  save(DUMMY_ENROLLMENT_APPLICATIONS);
}

function load(): EnrollmentApplicationRecord[] {
  seedDevDummyIfNeeded();
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

  /** Dev-only: reset store and re-seed dummy applications (empty admin table → refresh after calling). */
  resetToDevDummy(): void {
    if (!import.meta.env.DEV) return;
    localStorage.removeItem(STORAGE_KEY);
    seedDevDummyIfNeeded();
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
  },
};
