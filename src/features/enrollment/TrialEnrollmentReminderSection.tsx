import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { EnrollmentTrialBadge } from "@/features/enrollment/EnrollmentTrialBadge";
import {
  enrollmentHasTrialCode,
  formatEnrollmentTrialCode,
} from "@/features/enrollment/enrollmentTrial";

function PendingTrialCard({ record }: { record: EnrollmentApplicationResponse }) {
  const { t } = useTranslation();
  const code = formatEnrollmentTrialCode(record);

  return (
    <article className="overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/40 shadow-sm">
      <div className="border-b border-violet-100/80 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
          <h3 className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">
            {record.courseTitle ?? record.courseId}
          </h3>
          <EnrollmentTrialBadge />
        </div>
        {code ? (
          <p className="mt-2 font-mono text-[11px] text-violet-900/80">
            {t("payment.trial.codeLabel")}: {code}
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-violet-950/90">{t("payment.trial.pendingReview")}</p>
      </div>
      <div className="flex justify-end px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-violet-200 bg-white text-violet-900 hover:bg-violet-50"
          asChild
        >
          <Link to={`/dashboard/payment?applicationId=${encodeURIComponent(record.id)}`}>
            {t("payment.viewDetails")}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

/** Pending trial enrollment applications awaiting school review. */
export function TrialEnrollmentReminderSection({
  applications,
}: {
  applications: EnrollmentApplicationResponse[];
}) {
  const { t } = useTranslation();

  const pendingTrial = useMemo(
    () => applications.filter((a) => a.status === "PENDING" && enrollmentHasTrialCode(a)),
    [applications],
  );

  if (!pendingTrial.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          {t("payment.trial.sectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t("payment.trial.sectionHint")}</p>
      </div>
      <div className="space-y-3">
        {pendingTrial.map((record) => (
          <PendingTrialCard key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}
