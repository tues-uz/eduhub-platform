import { Badge } from "@/components/ui/badge";
import type { ClassStatus, PaymentStatus, StudentStatus } from "@/features/admin/data/adminOperationalMock";

/** API publish workflow for lecturer classes — used in admin class list & review. */
const courseStatusClass: Record<string, string> = {
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-800",
  SCHEDULE_PENDING: "border-blue-200 bg-blue-50 text-blue-800",
  SCHEDULE_APPROVED: "border-teal-200 bg-teal-50 text-teal-800",
  REJECTED: "border-red-200 bg-red-50 text-red-800",
  ARCHIVED: "border-slate-300 bg-slate-100 text-slate-700",
};

const courseStatusLabel: Record<string, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  SCHEDULE_PENDING: "Schedule Pending",
  SCHEDULE_APPROVED: "Schedule Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export function CourseStatusBadge({ status }: { status?: string | null }) {
  if (status == null || status === "") {
    return (
      <Badge variant="outline" className="font-medium border-slate-200 bg-slate-50 text-slate-500">
        —
      </Badge>
    );
  }
  const tone = courseStatusClass[status] ?? "border-slate-200 bg-slate-50 text-slate-700";
  const label = courseStatusLabel[status] ?? status;
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

const paymentLabel: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={paymentVariant[status]} className="font-medium capitalize">
      {paymentLabel[status]}
    </Badge>
  );
}

const classVariant: Record<ClassStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  waiting: "secondary",
  completed: "outline",
};

const classLabel: Record<ClassStatus, string> = {
  active: "Active",
  waiting: "Waiting",
  completed: "Completed",
};

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return (
    <Badge variant={classVariant[status]} className="font-medium capitalize">
      {classLabel[status]}
    </Badge>
  );
}

const studentVariant: Record<StudentStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  trial: "secondary",
  inactive: "outline",
};

const studentLabel: Record<StudentStatus, string> = {
  active: "Active",
  trial: "Trial",
  inactive: "Inactive",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return (
    <Badge variant={studentVariant[status]} className="font-medium capitalize">
      {studentLabel[status]}
    </Badge>
  );
}
