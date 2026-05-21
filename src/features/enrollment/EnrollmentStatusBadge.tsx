import { cn } from "@/lib/utils";
import {
  ENROLLMENT_STATUS_BADGE,
  type StudentCourseEnrollmentDisplayStatus,
} from "@/features/enrollment/studentCourseEnrollmentStatus";

type Props = {
  status: StudentCourseEnrollmentDisplayStatus;
  className?: string;
};

export function EnrollmentStatusBadge({ status, className }: Props) {
  if (status === "not_enrolled") return null;
  const badge = ENROLLMENT_STATUS_BADGE[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1.5 text-xs font-medium shadow-sm",
        badge.className,
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
