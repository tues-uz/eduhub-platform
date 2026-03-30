import { Badge } from "@/components/ui/badge";
import type { ClassStatus, PaymentStatus, StudentStatus } from "@/features/admin/data/adminOperationalMock";

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
