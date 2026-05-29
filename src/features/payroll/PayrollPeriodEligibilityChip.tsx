import { cn } from "@/lib/utils";
import type { PayrollPeriodOption } from "@/features/payroll/payrollScheduleEligibility";

type Props = {
  option: Pick<PayrollPeriodOption, "eligible" | "finishedCount" | "sessionCount">;
  className?: string;
};

export function PayrollPeriodEligibilityChip({ option, className }: Props) {
  if (option.eligible) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/90",
          className,
        )}
      >
        Ready for payroll
      </span>
    );
  }

  if (option.finishedCount > 0) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/90",
          className,
        )}
      >
        {option.finishedCount}/{option.sessionCount} meetings done
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/90",
        className,
      )}
    >
      Not ready
    </span>
  );
}
