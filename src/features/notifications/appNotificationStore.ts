import type { SubstituteInviteRecord } from "@/features/teacher/data/substituteInviteWorkflowStore";
import type { AttendanceSessionLogEntry } from "@/features/teacher/attendance/attendanceSessionLogsStorage";
import { endReasonLabel, formatDurationMs } from "@/features/teacher/attendance/attendanceSessionLogsStorage";

const STORAGE_KEY = "eduhub_app_notifications_v1";

export const APP_NOTIFICATIONS_CHANGE_EVENT = "eduhub-app-notifications-changed";

export type AppNotificationKind =
  | "enrollment_approved"
  | "enrollment_rejected"
  | "enrollment_receipt_ready"
  | "admin_enrollment_action"
  | "instructor_payroll_paid"
  | "admin_instructor_payroll_request"
  | "instructor_payroll_request_approved"
  | "instructor_payroll_request_rejected"
  | "admin_substitute_invite_request"
  | "instructor_substitute_invitation"
  | "instructor_substitute_invite_sent"
  | "instructor_substitute_need_primary_approval"
  | "instructor_substitute_cover_confirmed"
  | "instructor_substitute_declined_notice"
  | "instructor_substitute_rejected_notice"
  | "instructor_substitute_awaiting_primary"
  | "admin_substitute_final_approval_needed"
  | "admin_substitute_invite_declined"
  | "instructor_substitute_awaiting_admin"
  | "instructor_substitute_pending_admin_review"
  | "instructor_substitute_inviter_final_ok"
  | "instructor_substitute_admin_rejected"
  | "instructor_attendance_qr_generated"
  | "admin_attendance_qr_generated"
  | "instructor_attendance_session_completed"
  | "admin_attendance_session_completed";

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
  /** Deep link for admin / instructor UIs (demo). */
  href?: string;
  /** Links to substituteInviteWorkflowStore row for Accept / Approve actions. */
  refId?: string;
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
  applicationId?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
}): void {
  const now = new Date().toISOString();
  const norm = opts.studentEmailNorm.trim().toLowerCase();
  const paymentHref = opts.applicationId
    ? `/dashboard/payment?applicationId=${encodeURIComponent(opts.applicationId)}`
    : "/dashboard/payment";

  const studentTitle =
    opts.decision === "approved" ? "Enrollment approved — receipt ready" : "Enrollment not approved";
  const receiptRef =
    opts.receiptNumber && opts.invoiceNumber
      ? ` Receipt ${opts.receiptNumber} (invoice ${opts.invoiceNumber}).`
      : opts.receiptNumber
        ? ` Receipt ${opts.receiptNumber}.`
        : "";
  const studentBody =
    opts.decision === "approved"
      ? `You can now access "${opts.courseTitle}".${receiptRef} Download your invoice and receipt from Payment history.`
      : `Your enrollment request for "${opts.courseTitle}" was not approved.${opts.adminNote ? ` Note: ${opts.adminNote}` : ""}`;

  pushNotification({
    id: crypto.randomUUID(),
    kind: opts.decision === "approved" ? "enrollment_receipt_ready" : "enrollment_rejected",
    audience: "student",
    studentEmailNorm: norm,
    title: studentTitle,
    body: studentBody,
    createdAt: now,
    read: false,
    href: opts.decision === "approved" ? paymentHref : undefined,
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
  const targets = instructorNotificationTargets(opts.instructorEmailNorm, opts.instructorName);
  if (!targets.instructorEmailNorm && !targets.instructorNameNorm) return;
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
    ...targets,
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

function sessionNotePart(sessionNote: string): string {
  const t = sessionNote.trim();
  return t ? ` Session / date: ${t}.` : "";
}

function messageNotePart(message: string): string {
  const raw = message.trim();
  return raw ? ` Note: ${raw.slice(0, 240)}${raw.length > 240 ? "…" : ""}` : "";
}

/** After primary sends invite from roster — admin + substitute + primary tracking. */
export function pushSubstituteInviteNotifications(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  const note = messageNotePart(record.message);
  const subNorm = record.substituteEmailNorm;
  const primaryNorm = record.primaryInstructorEmailNorm;

  const adminBody = `${record.primaryInstructorName} invited ${subNorm} to cover "${record.courseTitle}".${session}${note}`;
  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_substitute_invite_request",
    audience: "admin",
    title: "Substitute instructor invited",
    body: adminBody,
    createdAt: now,
    read: false,
    href: `/dashboard/admin/substitute-requests/${record.id}`,
    refId: record.id,
  });

  const rosterPath =
    record.courseId && !record.courseId.startsWith("local-")
      ? `/dashboard/teacher/courses/${record.courseId}`
      : "/dashboard/teacher/courses";

  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_invitation",
    audience: "instructor",
    instructorEmailNorm: subNorm,
    title: `Substitute request: ${record.courseTitle}`,
    body: `${record.primaryInstructorName} asked you to cover this class.${session}${note} Use Accept or Decline below.`,
    createdAt: now,
    read: false,
    href: rosterPath,
    refId: record.id,
  });

  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_invite_sent",
    audience: "instructor",
    instructorEmailNorm: primaryNorm,
    title: "Substitute invite sent",
    body: `You invited ${subNorm} to cover "${record.courseTitle}".${session} After they accept, you approve here, then an admin gives final approval.`,
    createdAt: now,
    read: false,
    href: "/dashboard/teacher/notifications",
    refId: record.id,
  });
}

/** Substitute accepted — primary must approve. */
export function notifySubstituteAcceptedAwaitingPrimary(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_need_primary_approval",
    audience: "instructor",
    instructorEmailNorm: record.primaryInstructorEmailNorm,
    title: "Approve substitute cover",
    body: `${record.substituteEmailNorm} accepted your substitute invite for "${record.courseTitle}".${session} Confirm below.`,
    createdAt: now,
    read: false,
    href: "/dashboard/teacher/notifications",
    refId: record.id,
  });
}

export function notifySubstituteWaitingPrimaryApproval(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_awaiting_primary",
    audience: "instructor",
    instructorEmailNorm: record.substituteEmailNorm,
    title: "Waiting for primary instructor",
    body: `You accepted the cover for "${record.courseTitle}". Waiting for ${record.primaryInstructorName} to approve.`,
    createdAt: now,
    read: false,
    refId: record.id,
  });
}

export function notifySubstituteDeclinedPrimary(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_declined_notice",
    audience: "instructor",
    instructorEmailNorm: record.primaryInstructorEmailNorm,
    title: "Substitute declined your invite",
    body: `${record.substituteEmailNorm} declined to cover "${record.courseTitle}" for you.${session} You can invite someone else or adjust the class plan.`,
    createdAt: now,
    read: false,
    refId: record.id,
    href: "/dashboard/teacher/courses",
  });
}

/** Inform admins when the substitute instructor declines (demo). */
export function notifyAdminSubstituteInviteDeclined(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_substitute_invite_declined",
    audience: "admin",
    title: "Substitute declined invitation",
    body: `${record.substituteEmailNorm} declined ${record.primaryInstructorName}'s substitute request for "${record.courseTitle}".${session}`,
    createdAt: now,
    read: false,
    refId: record.id,
    href: `/dashboard/admin/substitute-requests/${record.id}`,
  });
}

/** Primary instructor approved → substitute waiting + primary notified + admin must finalize. */
export function notifyAfterPrimaryApprovedPendingAdmin(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  const note = messageNotePart(record.message);

  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_substitute_final_approval_needed",
    audience: "admin",
    title: "Final approval: substitute cover",
    body: `${record.primaryInstructorName} approved ${record.substituteEmailNorm} as substitute for "${record.courseTitle}".${session}${note} Open the request to give final approval or reject.`,
    createdAt: now,
    read: false,
    refId: record.id,
    href: `/dashboard/admin/substitute-requests/${record.id}`,
  });

  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_awaiting_admin",
    audience: "instructor",
    instructorEmailNorm: record.substituteEmailNorm,
    title: "Waiting for admin approval",
    body: `You agreed to cover "${record.courseTitle}". The inviting instructor approved; an admin must give final sign-off.`,
    createdAt: now,
    read: false,
    refId: record.id,
    href: "/dashboard/teacher/notifications",
  });

  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_pending_admin_review",
    audience: "instructor",
    instructorEmailNorm: record.primaryInstructorEmailNorm,
    title: "Waiting for admin (final step)",
    body: `You approved ${record.substituteEmailNorm} to cover "${record.courseTitle}".${session} An admin will complete the last approval.`,
    createdAt: now,
    read: false,
    refId: record.id,
    href: "/dashboard/teacher/notifications",
  });
}

/** After admin approves substitute cover — notify substitute and primary separately. */
export function notifySubstituteCoverFullyApproved(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  const primary = record.primaryInstructorName.trim();
  const courseHref =
    record.courseId && !record.courseId.startsWith("local-")
      ? `/dashboard/teacher/courses/${record.courseId}`
      : "/dashboard/teacher/courses";
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_cover_confirmed",
    audience: "instructor",
    instructorEmailNorm: record.substituteEmailNorm,
    title: "Substitute cover confirmed",
    body: `Admin approved the substitute cover for "${record.courseTitle}".${session} ${primary} (course lead) was notified as well.`,
    createdAt: now,
    read: false,
    href: courseHref,
    refId: record.id,
  });
}

export function notifyInviterSubstituteFinalizedByAdmin(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  const sub = record.substituteEmailNorm;
  const courseHref =
    record.courseId && !record.courseId.startsWith("local-")
      ? `/dashboard/teacher/courses/${record.courseId}`
      : "/dashboard/teacher/courses";
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_inviter_final_ok",
    audience: "instructor",
    instructorEmailNorm: record.primaryInstructorEmailNorm,
    instructorNameNorm: record.primaryInstructorName.trim().toLowerCase(),
    title: "Substitute cover finalized",
    body: `Admin approved ${sub} as substitute for "${record.courseTitle}".${session} The substitute was notified as well.`,
    createdAt: now,
    read: false,
    href: courseHref,
    refId: record.id,
  });
}

/** After admin rejects substitute cover — notify substitute and primary separately. */
export function notifyAdminRejectedSubstituteCover(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  const session = sessionNotePart(record.sessionNote);
  const primary = record.primaryInstructorName.trim();
  const base = `Admin did not approve the substitute arrangement for "${record.courseTitle}".${session}`;
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_admin_rejected",
    audience: "instructor",
    instructorEmailNorm: record.substituteEmailNorm,
    title: "Substitute cover not approved by admin",
    body: `${base} ${primary} (course lead) was notified too. Contact your admin if you have questions.`,
    createdAt: now,
    read: false,
    href: "/dashboard/teacher/notifications",
    refId: record.id,
  });
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_admin_rejected",
    audience: "instructor",
    instructorEmailNorm: record.primaryInstructorEmailNorm,
    instructorNameNorm: record.primaryInstructorName.trim().toLowerCase(),
    title: "Substitute cover not approved by admin",
    body: `${base} Substitute ${record.substituteEmailNorm} was notified too. You may invite another lecturer.`,
    createdAt: now,
    read: false,
    href: "/dashboard/teacher/notifications",
    refId: record.id,
  });
}

export function notifySubstituteRejectedByPrimary(record: SubstituteInviteRecord): void {
  const now = new Date().toISOString();
  pushNotification({
    id: crypto.randomUUID(),
    kind: "instructor_substitute_rejected_notice",
    audience: "instructor",
    instructorEmailNorm: record.substituteEmailNorm,
    title: "Substitute cover not approved",
    body: `${record.primaryInstructorName} did not approve the substitute cover for "${record.courseTitle}".`,
    createdAt: now,
    read: false,
    refId: record.id,
  });
}

/** Logged when an instructor generates a check-in QR (local demo; same browser storage). */
export function notifyAttendanceQrGenerated(entry: AttendanceSessionLogEntry): void {
  const now = new Date().toISOString();
  const targets = instructorNotificationTargets(entry.instructorEmail, entry.instructorName);
  const who = entry.instructorName.trim() || entry.instructorEmail.trim() || "Instructor";
  const body = `"${entry.courseTitle}" · ${entry.meetingName.trim() || "Meeting"} · Started ${new Date(entry.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`;

  if (targets.instructorEmailNorm || targets.instructorNameNorm) {
    pushNotification({
      id: crypto.randomUUID(),
      kind: "instructor_attendance_qr_generated",
      audience: "instructor",
      ...targets,
      title: "Attendance QR generated",
      body,
      createdAt: now,
      read: false,
      href: "/dashboard/teacher/attendance",
      refId: entry.id,
    });
  }

  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_attendance_qr_generated",
    audience: "admin",
    title: "Attendance QR generated",
    body: `${who}: ${body}`,
    createdAt: now,
    read: false,
    href: "/dashboard/admin/notifications",
    refId: entry.id,
  });
}

/** Logged when a session ends (new QR, max duration, or switched class); includes time in class. */
export function notifyAttendanceSessionCompleted(entry: AttendanceSessionLogEntry): void {
  if (entry.endedAt == null || entry.durationMs == null) return;
  const now = new Date().toISOString();
  const targets = instructorNotificationTargets(entry.instructorEmail, entry.instructorName);
  const who = entry.instructorName.trim() || entry.instructorEmail.trim() || "Instructor";
  const duration = formatDurationMs(entry.durationMs);
  const reason = entry.endReason ? endReasonLabel(entry.endReason) : "Session ended";
  const body = `Time in class: ${duration}. ${reason}. · "${entry.courseTitle}" · ${entry.meetingName.trim() || "Meeting"}.`;

  if (targets.instructorEmailNorm || targets.instructorNameNorm) {
    pushNotification({
      id: crypto.randomUUID(),
      kind: "instructor_attendance_session_completed",
      audience: "instructor",
      ...targets,
      title: "Attendance session log",
      body,
      createdAt: now,
      read: false,
      href: "/dashboard/teacher/attendance",
      refId: entry.id,
    });
  }

  pushNotification({
    id: crypto.randomUUID(),
    kind: "admin_attendance_session_completed",
    audience: "admin",
    title: "Attendance session completed",
    body: `${who}: ${body}`,
    createdAt: now,
    read: false,
    href: "/dashboard/admin/notifications",
    refId: entry.id,
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
