import { endReasonLabel, formatDurationMs } from "@/features/teacher/attendance/attendanceMeetingsStorage";

export const APP_NOTIFICATIONS_CHANGE_EVENT = "eduhub-app-notifications-changed";

export type AppNotificationKind =
  | "enrollment_approved"
  | "enrollment_rejected"
  | "payment_reminder"
  | "payroll_submitted"
  | "attendance_completed"
  | "instructor_payroll_paid"
  | "admin_instructor_payroll_request"
  | "instructor_payroll_request_approved"
  | "instructor_payroll_request_rejected"
  | "instructor_attendance_qr_generated"
  | "admin_attendance_qr_generated"
  | "instructor_attendance_session_completed"
  | "admin_attendance_session_completed"
  | "general";

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  audience: "student" | "admin" | "instructor";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  refId?: string;
  studentEmailNorm?: string;
  instructorEmailNorm?: string;
  instructorNameNorm?: string;
};


let memoryNotifications: AppNotification[] = [];

function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_CHANGE_EVENT));
  }
}

function load(): AppNotification[] {
  return memoryNotifications;
}

function save(items: AppNotification[]) {
  memoryNotifications = items;
  emitChanged();
}


function pushNotification(n: AppNotification) {
  const all = load();
  all.unshift(n);
  save(all.slice(0, 200));
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

export type AttendanceQrGeneratedNotice = {
  id: string;
  courseTitle: string;
  meetingName: string;
  startedAt: string;
  instructorEmail: string;
  instructorName: string;
};

export type AttendanceSessionCompletedNotice = {
  id: string;
  courseTitle: string;
  meetingName: string;
  endedAt: string;
  durationMs: number;
  endReason?: string;
  instructorEmail: string;
  instructorName: string;
};

/** Fired with the backend's own response when an instructor generates a check-in QR. */
export function notifyAttendanceQrGenerated(entry: AttendanceQrGeneratedNotice): void {
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

/** Fired with the backend's own response when an attendance session ends (manual stop or 2h15m cap). */
export function notifyAttendanceSessionCompleted(entry: AttendanceSessionCompletedNotice): void {
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
