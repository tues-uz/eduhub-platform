import type { LucideIcon } from "@/lib/icons";
import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Megaphone,
  QrCode,
  Receipt,
  XCircle,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

export function formatNotificationRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export type NotificationIconTone = "success" | "error" | "warning" | "info" | "neutral";

type NotificationIconConfig = {
  Icon: LucideIcon;
  iconClass: string;
  tone: NotificationIconTone;
};

function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase().replace(/-/g, "_");
}

function iconFromTitle(title: string): NotificationIconConfig | null {
  const t = title.trim().toLowerCase();
  if (!t) return null;

  if (/enrollment\s+(approved|accepted)|receipt ready|enrolled in/.test(t)) {
    return { Icon: CheckCircle2, iconClass: "text-green-600", tone: "success" };
  }
  if (/enrollment\s+(rejected|denied)|not approved/.test(t)) {
    return { Icon: XCircle, iconClass: "text-red-500", tone: "error" };
  }
  if (/assignment|homework|essay|quiz due|submitted/.test(t)) {
    return { Icon: FileText, iconClass: "text-blue-600", tone: "info" };
  }
  if (/certificate|earned certificate|course completed/.test(t)) {
    return { Icon: Award, iconClass: "text-amber-600", tone: "warning" };
  }
  if (/class update|new lesson|lesson available|my class|course access|can now access/.test(t)) {
    return { Icon: BookOpen, iconClass: "text-blue-600", tone: "info" };
  }
  if (/schedule|session|class starts|upcoming class/.test(t)) {
    return { Icon: Calendar, iconClass: "text-[#3954d0]", tone: "info" };
  }
  if (/payment|invoice|receipt|payroll|payout/.test(t)) {
    return { Icon: Receipt, iconClass: "text-green-600", tone: "success" };
  }
  if (/maintenance|announcement|system update/.test(t)) {
    return { Icon: Megaphone, iconClass: "text-slate-600", tone: "neutral" };
  }
  if (/check-in|check in|attendance|scan the qr|qr code/.test(t)) {
    return { Icon: QrCode, iconClass: "text-[#3954d0]", tone: "info" };
  }

  return null;
}

function iconFromKind(kind: string): NotificationIconConfig | null {
  switch (normalizeKind(kind)) {
    case "enrollment_approved":
    case "enrollment_receipt_ready":
    case "course_published":
    case "schedule_approved":
    case "instructor_payroll_request_approved":
    case "instructor_substitute_cover_confirmed":
    case "instructor_substitute_inviter_final_ok":
      return { Icon: CheckCircle2, iconClass: "text-green-600", tone: "success" };
    case "enrollment_rejected":
    case "course_rejected":
    case "instructor_payroll_request_rejected":
    case "instructor_substitute_admin_rejected":
    case "instructor_substitute_rejected_notice":
    case "instructor_substitute_declined_notice":
      return { Icon: XCircle, iconClass: "text-red-500", tone: "error" };
    case "schedule_proposed":
    case "instructor_substitute_invitation":
    case "instructor_substitute_need_primary_approval":
      return { Icon: Calendar, iconClass: "text-[#3954d0]", tone: "info" };
    case "admin_enrollment_action":
    case "admin_substitute_invite_request":
    case "admin_substitute_final_approval_needed":
    case "instructor_substitute_awaiting_primary":
    case "instructor_substitute_awaiting_admin":
    case "instructor_substitute_pending_admin_review":
      return { Icon: AlertCircle, iconClass: "text-amber-600", tone: "warning" };
    case "instructor_payroll_paid":
    case "admin_instructor_payroll_request":
      return { Icon: Receipt, iconClass: "text-green-600", tone: "success" };
    case "student_attendance_check_in_open":
      return { Icon: QrCode, iconClass: "text-[#3954d0]", tone: "info" };
    default:
      return null;
  }
}

export type StudentNotificationCategory =
  | "enrollment"
  | "class"
  | "payment"
  | "certificate"
  | "schedule"
  | "attendance"
  | "other";

export function resolveStudentNotificationCategory(
  kind: string,
  title?: string,
): StudentNotificationCategory {
  const k = normalizeKind(kind);
  const t = (title ?? "").trim().toLowerCase();

  switch (k) {
    case "enrollment_approved":
    case "enrollment_rejected":
    case "enrollment_receipt_ready":
    case "admin_enrollment_action":
      return "enrollment";
    case "course_published":
    case "course_rejected":
      return "class";
    case "schedule_proposed":
    case "schedule_approved":
      return "schedule";
    case "student_attendance_check_in_open":
      return "attendance";
    default:
      break;
  }

  if (/check-in|check in|attendance|scan the qr|qr code/.test(t)) return "attendance";
  if (/enrollment|enrolled|not approved/.test(t)) return "enrollment";
  if (/certificate|course completed|earned certificate/.test(t)) return "certificate";
  if (/payment|invoice|receipt|payroll|payout/.test(t)) return "payment";
  if (/schedule|session|class starts|upcoming class/.test(t)) return "schedule";
  if (
    /class update|new lesson|lesson available|my class|course access|can now access|assignment|homework|quiz/.test(
      t,
    )
  ) {
    return "class";
  }

  return "other";
}

export function resolveNotificationIcon(kind: string, title?: string): NotificationIconConfig {
  return iconFromKind(kind) ?? iconFromTitle(title ?? "") ?? {
    Icon: Bell,
    iconClass: "text-foreground/60",
    tone: "neutral",
  };
}

export function notificationIconToneBgClass(tone: NotificationIconTone): string {
  switch (tone) {
    case "success":
      return "bg-green-50";
    case "error":
      return "bg-red-50";
    case "warning":
      return "bg-amber-50";
    case "info":
      return "bg-blue-50";
    default:
      return "bg-white";
  }
}

export function NotificationKindIcon({
  kind,
  title,
  className = "h-4 w-4",
}: {
  kind: string;
  title?: string;
  className?: string;
}) {
  const { Icon, iconClass } = resolveNotificationIcon(kind, title);
  return <Icon className={`${className} ${iconClass}`} aria-hidden />;
}

/** Renders notification body with quoted names (e.g. course titles) emphasized. */
function parseEnrollmentApprovedBody(body: string): {
  courseName: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  actionHint?: string;
} | null {
  const trimmed = body.trim();
  if (!/^you can now access/i.test(trimmed)) return null;

  const lines = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  if (lines.length > 1) {
    const quotedAccess = lines[0].match(/^You can now access\s+"([^"]+)"\.?\s*$/i);
    const plainAccess = quotedAccess
      ? null
      : lines[0].match(/^You can now access\s+(.+?)\.\s*$/i);
    const courseName = quotedAccess?.[1] ?? plainAccess?.[1]?.trim();
    if (!courseName) return null;

    let receiptNumber: string | undefined;
    let invoiceNumber: string | undefined;
    const actionHints: string[] = [];

    for (const line of lines.slice(1)) {
      const receiptLine = line.match(/^Receipt\s+(\S+)(?:\s*\(\s*invoice\s+(\S+)\s*\))?\.?\s*$/i);
      if (receiptLine) {
        receiptNumber = receiptLine[1];
        invoiceNumber = receiptLine[2];
        continue;
      }
      actionHints.push(line.replace(/\.\s*$/, ""));
    }

    return {
      courseName,
      receiptNumber,
      invoiceNumber,
      actionHint: actionHints.length ? actionHints.join(" ") : undefined,
    };
  }

  const accessMatch =
    trimmed.match(/^You can now access\s+"([^"]+)"\.?\s*/i) ??
    trimmed.match(/^You can now access\s+(.+?)\.\s+/i);
  if (!accessMatch) return null;

  const courseName = accessMatch[1].trim();
  let rest = trimmed.slice(accessMatch[0].length).trim();

  let receiptNumber: string | undefined;
  let invoiceNumber: string | undefined;

  const inlineReceipt = rest.match(/^Receipt\s+(\S+)(?:\s*\(\s*invoice\s+(\S+)\s*\))?\.?\s*(.*)$/is);
  if (inlineReceipt) {
    receiptNumber = inlineReceipt[1];
    invoiceNumber = inlineReceipt[2];
    rest = inlineReceipt[3]?.trim() ?? "";
  }

  return {
    courseName,
    receiptNumber,
    invoiceNumber,
    actionHint: rest ? rest.replace(/\.\s*$/, "") : undefined,
  };
}

function renderPlainNotificationBody(body: string, className: string) {
  const parts = body.split(/"([^"]+)"/g);

  return (
    <p className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-semibold text-foreground/80">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

export function NotificationBodyText({
  body,
  className = "text-sm text-foreground/60",
}: {
  body: string;
  className?: string;
}) {
  const enrollmentApproved = parseEnrollmentApprovedBody(body);

  if (enrollmentApproved) {
    const { courseName, receiptNumber, invoiceNumber, actionHint } = enrollmentApproved;

    return (
      <div className={cn("mt-1 space-y-2", className)}>
        <p className="leading-relaxed text-foreground/70">
          You can now access{" "}
          <span className="font-semibold text-foreground">{courseName}</span>.
        </p>
        {receiptNumber || invoiceNumber ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5">
            {receiptNumber ? (
              <>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                  Receipt
                </dt>
                <dd className="font-mono text-[13px] font-medium text-foreground/85">{receiptNumber}</dd>
              </>
            ) : null}
            {invoiceNumber ? (
              <>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                  Invoice
                </dt>
                <dd className="font-mono text-[13px] font-medium text-foreground/85">{invoiceNumber}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        {actionHint ? (
          <p className="text-xs leading-relaxed text-foreground/50">{actionHint}</p>
        ) : null}
      </div>
    );
  }

  return renderPlainNotificationBody(body, className);
}
