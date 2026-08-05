import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ClassStatus, PaymentStatus, StudentStatus } from "@/api/eduhubTypes";

/** API publish workflow for lecturer classes — used in admin class list & review. */
const courseStatusClass: Record<string, string> = {
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-800",
  SCHEDULE_PENDING: "border-blue-200 bg-blue-50 text-blue-800",
  SCHEDULE_APPROVED: "border-teal-200 bg-teal-50 text-teal-800",
  REJECTED: "border-red-200 bg-red-50 text-red-800",
  ARCHIVED: "border-slate-300 bg-slate-100 text-slate-700",
};

const courseStatusKey: Record<string, string> = {
  PUBLISHED: "admin.components.statusBadges.course.published",
  DRAFT: "admin.components.statusBadges.course.draft",
  SCHEDULE_PENDING: "admin.components.statusBadges.course.schedulePending",
  SCHEDULE_APPROVED: "admin.components.statusBadges.course.scheduleApproved",
  REJECTED: "admin.components.statusBadges.course.rejected",
  ARCHIVED: "admin.components.statusBadges.course.archived",
};

export function CourseStatusBadge({ status }: { status?: string | null }) {
  const { t } = useTranslation();
  if (status == null || status === "") {
    return (
      <Badge variant="outline" className="font-medium border-slate-200 bg-slate-50 text-slate-500">
        {t("common.notAvailable")}
      </Badge>
    );
  }
  const tone = courseStatusClass[status] ?? "border-slate-200 bg-slate-50 text-slate-700";
  const key = courseStatusKey[status];
  const label = key ? t(key) : status;
  return (
    <Badge variant="outline" className={`font-medium ${tone}`}>
      {label}
    </Badge>
  );
}

const paymentVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
};

const paymentKey: Record<PaymentStatus, string> = {
  paid: "admin.components.statusBadges.payment.paid",
  pending: "admin.components.statusBadges.payment.pending",
  overdue: "admin.components.statusBadges.payment.overdue",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={paymentVariant[status]} className="font-medium capitalize">
      {t(paymentKey[status])}
    </Badge>
  );
}

const classVariant: Record<ClassStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  waiting: "secondary",
  completed: "outline",
};

const classKey: Record<ClassStatus, string> = {
  active: "admin.components.statusBadges.class.active",
  waiting: "admin.components.statusBadges.class.waiting",
  completed: "admin.components.statusBadges.class.completed",
};

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={classVariant[status]} className="font-medium capitalize">
      {t(classKey[status])}
    </Badge>
  );
}

const studentVariant: Record<StudentStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  trial: "secondary",
  inactive: "outline",
};

const studentKey: Record<StudentStatus, string> = {
  active: "admin.components.statusBadges.student.active",
  trial: "admin.components.statusBadges.student.trial",
  inactive: "admin.components.statusBadges.student.inactive",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={studentVariant[status]} className="font-medium capitalize">
      {t(studentKey[status])}
    </Badge>
  );
}
