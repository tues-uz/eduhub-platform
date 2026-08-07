import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { EnrollmentTrialBadge } from "@/features/enrollment/EnrollmentTrialBadge";
import {
  enrollmentHasTrialCode,
  formatEnrollmentTrialCode,
} from "@/features/enrollment/enrollmentTrial";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
} from "@/features/courses/classSchedulePreview";
import {
  buildPayableScheduleMonths,
  hasOutstandingTuition,
  installmentPaymentPath,
  unpaidPayableMonths,
} from "@/features/enrollment/enrollmentInstallmentPayments";
import { ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import { cn } from "@/lib/utils";

function formatPrice(price: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

type CardData = {
  application: EnrollmentApplicationResponse;
  paidCount: number;
  totalMonths: number;
  nextAmount: number | null;
  currency: string;
  nextMonthLabel: string | null;
  pendingCount: number;
  isTrial: boolean;
};

function OutstandingTuitionCard({ card }: { card: CardData }) {
  const { t } = useTranslation();
  const progressPct =
    card.totalMonths > 0 ? Math.round((card.paidCount / card.totalMonths) * 100) : 0;
  const trialCode = formatEnrollmentTrialCode(card.application);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm",
        card.isTrial ? "border-violet-200/80" : "border-zinc-200",
      )}
    >
      <div className={cn("border-b px-4 py-3.5 sm:px-5", card.isTrial ? "border-violet-100/80" : "border-zinc-100")}>
        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
          <h3 className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">
            {card.application.courseTitle ?? card.application.courseId}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {card.isTrial ? <EnrollmentTrialBadge /> : null}
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
              {card.paidCount} of {card.totalMonths} paid
            </span>
          </div>
        </div>
        {card.isTrial && trialCode ? (
          <p className="mt-2 font-mono text-[11px] text-violet-900/80">
            {t("payment.trial.codeLabel")}: {trialCode}
          </p>
        ) : null}
        {card.isTrial ? (
          <p className="mt-2 text-xs leading-relaxed text-violet-950/85">{t("payment.trial.continueHint")}</p>
        ) : null}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[#3954d0] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={card.paidCount}
            aria-valuemin={0}
            aria-valuemax={card.totalMonths}
            aria-label={`${card.paidCount} of ${card.totalMonths} schedule months paid`}
          />
        </div>
        {card.pendingCount > 0 ? (
          <p className="mt-2.5 text-[11px] font-medium text-sky-700">
            {card.pendingCount} payment{card.pendingCount === 1 ? "" : "s"} awaiting school review
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {card.nextAmount != null && card.nextMonthLabel ? (
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Next payment</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
              {formatPrice(card.nextAmount, card.currency)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{card.nextMonthLabel}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Remaining schedule months to pay</p>
        )}
        <Button
          asChild
          size="sm"
          className={cn(
            "h-10 shrink-0 rounded-xl bg-[#3954d0] px-4 text-sm font-medium hover:bg-[#2f47b3]",
            "w-full sm:w-auto",
          )}
        >
          <Link to={installmentPaymentPath(card.application.id)}>
            {card.isTrial ? t("payment.trial.payToContinue") : t("payment.outstandingPayNow")}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function OutstandingTuitionSection({
  applications,
}: {
  applications: EnrollmentApplicationResponse[];
}) {
  const { t } = useTranslation();
  const approved = useMemo(
    () => applications.filter((a) => a.status === "APPROVED"),
    [applications],
  );
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
    window.addEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    return () => {
      window.removeEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
      window.removeEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    };
  }, []);

  useEffect(() => {
    void tick;
    if (!approved.length) {
      setCards([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const results: CardData[] = [];
      for (const app of approved) {
        let listedTuition: number | undefined;
        let currency = app.priceCurrency ?? "USD";
        let slots = [] as ReturnType<typeof buildCourseScheduleSlots>;
        if (app.courseId && isUuid(app.courseId)) {
          try {
            const [course, proposal] = await Promise.all([
              eduhubCourses.getById(app.courseId),
              eduhubSchedule.getProposal(app.courseId).catch(() => null),
            ]);
            slots = buildCourseScheduleSlots(course, proposal, app.courseId);
            const amt = course.pricing?.discountedAmount ?? course.pricing?.amount;
            listedTuition = amt != null && amt > 0 ? amt : undefined;
            currency = course.pricing?.currency ?? currency;
          } catch {
            /* optional */
          }
        }
        const ordered = orderSessionSlotsChronologically(slots);
        const scheduleTabs = buildScheduleMonthTabs(ordered);
        const months = buildPayableScheduleMonths({
          enrollment: app,
          scheduleSlots: ordered,
          listedTuition,
          currency,
        });
        if (!hasOutstandingTuition(months)) continue;
        const outstanding = unpaidPayableMonths(months);
        const nextPayable = outstanding.find((m) => m.state === "payable");
        const pendingCount = outstanding.filter((m) => m.state === "pending_review").length;
        const paidCount = months.filter((m) => m.state === "paid").length;
        results.push({
          application: app,
          paidCount,
          totalMonths: scheduleTabs.length || months.length,
          nextAmount: nextPayable?.amount ?? outstanding[0]?.amount ?? null,
          currency,
          nextMonthLabel: nextPayable
            ? nextPayable.monthLine || nextPayable.tabLabel
            : outstanding[0]?.monthLine || outstanding[0]?.tabLabel || null,
          pendingCount,
          isTrial: enrollmentHasTrialCode(app),
        });
      }
      if (!cancelled) {
        setCards(results);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [approved, tick]);

  if (loading && !cards.length) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("payment.outstandingChecking")}
      </div>
    );
  }

  if (!cards.length) return null;

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="mb-3 flex w-full items-start justify-between gap-3 rounded-xl text-left transition-colors hover:bg-zinc-50/80 -mx-1 px-1 py-0.5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              {t("payment.outstandingTitle")}
            </h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
              {cards.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">{t("payment.outstandingHint")}</p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="space-y-3">
          {cards.map((card) => (
            <OutstandingTuitionCard key={card.application.id} card={card} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
