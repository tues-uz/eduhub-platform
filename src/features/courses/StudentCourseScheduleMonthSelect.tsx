import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "@/lib/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  buildScheduleMonthTabs,
  paymentMonthsToScheduleTab,
  scheduleTabToPaymentMonths,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";

type PaymentMonth = 1 | 2 | 3;

/** Whether the student may browse month-by-month sessions in the sidebar. */
export type ScheduleMonthSelectAccess = "full" | "pending_review" | "rejected" | "enrollment_required";

type Props = {
  slots: SessionSlotLike[];
  statusHint?: string | null;
  renderSession: (slot: SessionSlotLike, indexInMonth: number) => ReactNode;
  className?: string;
  access?: ScheduleMonthSelectAccess;
  enrollHref?: string;
  /** Months paid with the approved enrollment (1 = first month only, etc.). Omit when unknown. */
  paidTuitionMonths?: ReadonlySet<PaymentMonth> | null;
  paymentHref?: string;
};

function MonthTuitionStatusChip({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/90">
        Enrolled
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/90">
      Not enrolled
    </span>
  );
}

function MonthOptionRow({
  tabLabel,
  monthLine,
  monthNum,
  paidTuitionMonths,
  showStatusChip,
  inTrigger,
}: {
  tabLabel: string;
  monthLine: string;
  monthNum: PaymentMonth;
  paidTuitionMonths: ReadonlySet<PaymentMonth> | null | undefined;
  showStatusChip: boolean;
  inTrigger?: boolean;
}) {
  const paid = paidTuitionMonths?.has(monthNum) ?? false;

  return (
    <span
      className={cn(
        "flex min-w-0 items-center justify-start gap-2 overflow-hidden text-left",
        inTrigger ? "flex-1" : "w-full",
      )}
    >
      <span className="min-w-0 truncate">{monthSelectLabel(tabLabel, monthLine)}</span>
      {showStatusChip ? <MonthTuitionStatusChip paid={paid} /> : null}
    </span>
  );
}

const ACCESS_CHIP: Record<
  Exclude<ScheduleMonthSelectAccess, "full">,
  { label: string; className: string }
> = {
  enrollment_required: {
    label: "Enrollment required",
    className: "bg-amber-100 text-amber-900 ring-amber-200/90",
  },
  pending_review: {
    label: "Pending review",
    className: "bg-amber-50 text-amber-800 ring-amber-200/80",
  },
  rejected: {
    label: "Application declined",
    className: "bg-red-100 text-red-800 ring-red-200/90",
  },
};

function monthSelectLabel(tabLabel: string, monthLine: string): string {
  if (!monthLine || monthLine === "No dates yet" || monthLine === "Dates to be confirmed") {
    return tabLabel;
  }
  return `${tabLabel} · ${monthLine}`;
}

export function StudentCourseScheduleMonthSelect({
  slots,
  statusHint,
  renderSession,
  className,
  access = "full",
  enrollHref,
  paidTuitionMonths = null,
  paymentHref,
}: Props) {
  const scheduleMonthTabs = useMemo(() => buildScheduleMonthTabs(slots), [slots]);
  const [viewingMonth, setViewingMonth] = useState<PaymentMonth>(1);
  const locked = access !== "full";
  const showMonthStatusChips = !locked && paidTuitionMonths != null;
  const showPartialPlanBanner =
    showMonthStatusChips && paidTuitionMonths != null && paidTuitionMonths.size < 3;

  const tabValue = paymentMonthsToScheduleTab(
    viewingMonth ?? scheduleTabToPaymentMonths(scheduleMonthTabs[0]?.value ?? "m1"),
  );
  const activeTab = scheduleMonthTabs.find((t) => t.value === tabValue) ?? scheduleMonthTabs[0];
  const activeMonthNum = scheduleTabToPaymentMonths(activeTab?.value ?? "m1");
  const activeMonthPaid = paidTuitionMonths?.has(activeMonthNum) ?? true;
  const accessChip = locked ? ACCESS_CHIP[access] : null;

  if (!scheduleMonthTabs.length) {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        Session dates are not published yet. Your instructor or the school will confirm when class meets.
      </p>
    );
  }

  return (
    <div className={className}>
      {statusHint ? (
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">{statusHint}</p>
      ) : null}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Schedule month</p>
          {accessChip ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                accessChip.className,
              )}
            >
              <Lock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              {accessChip.label}
            </span>
          ) : null}
        </div>
        <Select
          value={tabValue}
          onValueChange={(v) => setViewingMonth(scheduleTabToPaymentMonths(v))}
          disabled={locked}
        >
          <SelectTrigger
            className={cn(
              "mt-1.5 h-11 rounded-full border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-900 shadow-none focus:ring-[#3954d0]/25",
              "[&>span:first-child]:flex [&>span:first-child]:min-w-0 [&>span:first-child]:flex-1 [&>span:first-child]:justify-start",
              locked && "cursor-not-allowed opacity-60",
            )}
            aria-label="Choose schedule month"
            aria-disabled={locked}
          >
            {activeTab ? (
              <MonthOptionRow
                tabLabel={activeTab.tabLabel}
                monthLine={activeTab.monthLine}
                monthNum={activeMonthNum}
                paidTuitionMonths={paidTuitionMonths}
                showStatusChip={showMonthStatusChips}
                inTrigger
              />
            ) : (
              <SelectValue placeholder="Select month" className="text-left" />
            )}
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-2xl border-zinc-200 p-1.5 shadow-lg">
            {scheduleMonthTabs.map((t) => {
              const monthNum = scheduleTabToPaymentMonths(t.value);
              return (
                <SelectItem key={t.value} value={t.value} className="rounded-xl text-xs py-2.5 pr-3">
                  <MonthOptionRow
                    tabLabel={t.tabLabel}
                    monthLine={t.monthLine}
                    monthNum={monthNum}
                    paidTuitionMonths={paidTuitionMonths}
                    showStatusChip={showMonthStatusChips}
                  />
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {locked ? (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-900/85">
            {access === "pending_review"
              ? "Your enrollment application is being reviewed. You can browse every session by month after approval."
              : access === "rejected"
                ? "Your last application was not approved. Submit a new request to unlock the full schedule."
                : "Join this class to browse every session by month and track attendance."}
            {enrollHref && access !== "pending_review" ? (
              <>
                {" "}
                <Link
                  to={enrollHref}
                  className="font-semibold text-[#3954d0] underline-offset-2 hover:underline"
                >
                  {access === "rejected" ? "Apply again" : "Join class"}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className={cn("mt-3 space-y-2.5", locked && "pointer-events-none opacity-50")}>
        {showPartialPlanBanner && !activeMonthPaid ? (
          <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
            You have not enrolled for this schedule month yet. Pay tuition for{" "}
            {activeTab?.tabLabel ?? "this month"} to access these sessions.
            {paymentHref ? (
              <>
                {" "}
                <Link
                  to={paymentHref}
                  className="font-semibold text-[#3954d0] underline-offset-2 hover:underline"
                >
                  View payment
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Sessions
          {activeTab?.slots.length != null ? ` (${activeTab.slots.length})` : ""}
        </p>
        {activeTab && activeTab.slots.length > 0 ? (
          activeTab.slots.map((slot, idx) => (
            <div key={`${activeTab.value}-${slot.sessionDate ?? ""}-${slot.sessionTime ?? ""}-${idx}`}>
              {renderSession(slot, idx)}
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs text-zinc-500">
            No sessions listed for this month.
          </p>
        )}
      </div>
    </div>
  );
}
