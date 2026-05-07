const STORAGE_KEY = "eduhub_app_notifications_v1";

export const APP_NOTIFICATIONS_CHANGE_EVENT = "eduhub-app-notifications-changed";

export type AppNotificationKind =
  | "enrollment_approved"
  | "enrollment_rejected"
  | "admin_enrollment_action"
  | "instructor_payroll_paid"
  | "admin_instructor_payroll_request"
  | "instructor_payroll_request_approved"
  | "instructor_payroll_request_rejected";

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  audience: "student" | "admin" | "instructor";
  /** When set, only this student (normalized email) sees the notification. */
  studentEmailNorm?: string;
  /** When set, only this instructor (normalized email) sees the notification. */
  instructorEmailNorm?: string;
  /** Fallback when instructor has no email on file (demo matching by display name). */
  instructorNameNorm?: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_CHANGE_EVENT));
}

function load(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as AppNotification[];
  } catch {
    return [];
  }
}

function save(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChanged();
}

function pushNotification(n: AppNotification) {
  const all = load();
  all.unshift(n);
  save(all.slice(0, 200));
}

/**
 * Called when an admin approves or rejects an enrollment application.
 * Creates one in-app notification for the student (matched by email) and one for admins.
 */
export function notifyEnrollmentDecision(opts: {
  courseTitle: string;
  courseId: string;
  studentName: string;
  studentEmailNorm: string;
  decision: "approved" | "rejected";
  adminNote?: string;
}): void {
  const now = new Date().toISOString();
  const norm = opts.studentEmailNorm.trim().toLowerCase();

  const studentTitle =
    opts.decision === "approved" ? "Enrollment approved" : "Enrollment not approved";
  const studentBody =
    opts.decision === "approved"
      ? `You can now access "${opts.courseTitle}". Open My Class to start learning.`
      : `Your enrollment request for "${opts.courseTitle}" was not approved.${opts.adminNote ? ` Note: ${opts.adminNote}` : ""}`;

  pushNotification({
    id: crypto.randomUUID(),
    kind: opts.decision === "approved" ? "enrollment_approved" : "enrollment_rejected",
    audience: "student",
    studentEmailNorm: norm,
    title: studentTitle,
    body: studentBody,
    createdAt: now,
    read: false,
  });

  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_enrollment_action",
    audience: "admin",
    title: opts.decision === "approved" ? "Enrollment approved" : "Enrollment rejected",
    body:
      opts.decision === "approved"
        ? `You approved ${opts.studentName} for "${opts.courseTitle}".`
        : `You rejected ${opts.studentName}'s application for "${opts.courseTitle}".`,
    createdAt: now,
    read: false,
  });
}

/** After admin submits instructor payout proof (local demo — replace with server push). */
export function notifyInstructorPayrollSubmitted(opts: {
  instructorEmailNorm: string;
  instructorName: string;
  classSection: string;
  course: string;
  /** e.g. collected amounts, estimated payout */
  summary: string;
  /** Optional snippet from admin information field */
  adminNote?: string;
}): void {
  const norm = opts.instructorEmailNorm.trim().toLowerCase();
  if (!norm) return;
  const now = new Date().toISOString();
  const rawNote = opts.adminNote?.trim() ?? "";
  const note =
    rawNote.length > 0
      ? ` Admin note: ${rawNote.slice(0, 280)}${rawNote.length > 280 ? "…" : ""}`
      : "";
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_payroll_paid",
    audience: "instructor",
    instructorEmailNorm: norm,
    title: "Payroll payout recorded",
    body: `Class ${opts.classSection} · ${opts.course}. ${opts.summary}.${note}`,
    createdAt: now,
    read: false,
  });
}

/** Instructor submitted payroll figures for admin review (local demo). */
export function notifyAdminInstructorPayrollRequest(opts: {
  instructorName: string;
  classSection: string;
  course: string;
  periodLabel?: string;
  sessionsTaught?: string;
  requestedPayout?: string;
  payoutDetails?: string;
  summary: string;
  instructorNotes?: string;
}): void {
  const now = new Date().toISOString();
  const raw = opts.instructorNotes?.trim() ?? "";
  const note =
    raw.length > 0 ? ` Instructor notes: ${raw.slice(0, 240)}${raw.length > 240 ? "…" : ""}` : "";
  const pieces = [
    opts.periodLabel?.trim() ? `Period: ${opts.periodLabel.trim()}.` : "",
    opts.sessionsTaught?.trim() ? `Sessions: ${opts.sessionsTaught.trim()}.` : "",
    opts.requestedPayout?.trim() ? `Requested: ${opts.requestedPayout.trim()}.` : "",
    opts.payoutDetails?.trim() ? `Payout: ${opts.payoutDetails.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_instructor_payroll_request",
    audience: "admin",
    title: "Instructor payroll request",
    body: `${opts.instructorName} requested payroll approval for ${opts.classSection} · ${opts.course}. ${pieces ? `${pieces} ` : ""}${opts.summary.trim()}${note}`,
    createdAt: now,
    read: false,
  });
}

function instructorNotificationTargets(emailNorm: string, instructorName: string) {
  const email = emailNorm.trim().toLowerCase();
  const nameNorm = instructorName.trim().toLowerCase();
  return {
    instructorEmailNorm: email || undefined,
    instructorNameNorm: !email && nameNorm ? nameNorm : undefined,
  };
}

/** Admin approved or rejected an instructor payroll request. */
export function notifyInstructorPayrollRequestDecision(opts: {
  instructorEmailNorm: string;
  instructorName: string;
  classSection: string;
  course: string;
  decision: "approved" | "rejected";
  adminNote?: string;
}): void {
  const targets = instructorNotificationTargets(opts.instructorEmailNorm, opts.instructorName);
  if (!targets.instructorEmailNorm && !targets.instructorNameNorm) return;
  const now = new Date().toISOString();
  const rawNote = opts.adminNote?.trim() ?? "";
  const note =
    rawNote.length > 0
      ? ` Note: ${rawNote.slice(0, 280)}${rawNote.length > 280 ? "…" : ""}`
      : "";
  const title =
    opts.decision === "approved" ? "Payroll request approved" : "Payroll request not approved";
  const body =
    opts.decision === "approved"
      ? `Your payroll submission for ${opts.classSection} · ${opts.course} was approved.${note}`
      : `Your payroll submission for ${opts.classSection} · ${opts.course} was not approved.${note}`;
  pushNotification({
    id: crypto.randomUUID(),
    kind: opts.decision === "approved" ? "instructor_payroll_request_approved" : "instructor_payroll_request_rejected",
    audience: "instructor",
    ...targets,
    title,
    body,
    createdAt: now,
    read: false,
  });
}

export const appNotificationStore = {
  list(): AppNotification[] {
    return load();
  },

  listForStudent(emailNorm: string): AppNotification[] {
    const n = emailNorm.trim().toLowerCase();
    return load().filter(
      (x) => x.audience === "student" && x.studentEmailNorm === n,
    );
  },

  listForAdmin(): AppNotification[] {
    return load().filter((x) => x.audience === "admin");
  },

  listForInstructor(emailNorm: string, instructorName?: string): AppNotification[] {
    const e = emailNorm.trim().toLowerCase();
    const name = instructorName?.trim().toLowerCase() ?? "";
    return load().filter((x) => {
      if (x.audience !== "instructor") return false;
      if (x.instructorEmailNorm && x.instructorEmailNorm === e) return true;
      if (x.instructorNameNorm && name && x.instructorNameNorm === name) return true;
      return false;
    });
  },

  markRead(id: string): void {
    const all = load();
    const i = all.findIndex((x) => x.id === id);
    if (i === -1) return;
    all[i] = { ...all[i], read: true };
    save(all);
  },

  markAllReadForStudent(emailNorm: string): void {
    const n = emailNorm.trim().toLowerCase();
    const all = load().map((x) =>
      x.audience === "student" && x.studentEmailNorm === n ? { ...x, read: true } : x,
    );
    save(all);
  },

  markAllReadForInstructor(emailNorm: string, instructorName?: string): void {
    const e = emailNorm.trim().toLowerCase();
    const name = instructorName?.trim().toLowerCase() ?? "";
    const all = load().map((x) => {
      if (x.audience !== "instructor") return x;
      const matchEmail = x.instructorEmailNorm && x.instructorEmailNorm === e;
      const matchName = x.instructorNameNorm && name && x.instructorNameNorm === name;
      return matchEmail || matchName ? { ...x, read: true } : x;
    });
    save(all);
  },
};
