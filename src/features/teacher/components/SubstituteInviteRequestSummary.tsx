import { useTranslation } from "react-i18next";
import type { SubstituteInviteRecord } from "@/features/teacher/data/substituteInviteWorkflowStore";

export function SubstituteInviteRequestSummary({
  rec,
  showInvitedSubstitute,
  variant = "default",
}: {
  rec: SubstituteInviteRecord;
  /** When true, shows the invited substitute email (e.g. admin notifications). */
  showInvitedSubstitute?: boolean;
  /** Tighter spacing for list cards (e.g. admin notifications). */
  variant?: "default" | "compact";
}) {
  const { t } = useTranslation();
  const inviterLine = `${rec.primaryInstructorName} · ${rec.primaryInstructorEmailNorm}`;
  const sessionLine = rec.sessionNote?.trim() || t("common.notAvailable");
  const note = rec.message?.trim();
  const compact = variant === "compact";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
          {t("teacher.substituteSummary.labels.course")}
        </p>
        <p
          className={`mt-1 font-semibold leading-snug text-foreground ${compact ? "text-base" : "text-lg"}`}
        >
          {rec.courseTitle}
        </p>
      </div>
      <div className={`grid sm:grid-cols-2 ${compact ? "gap-3" : "gap-4"}`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
            {t("teacher.substituteSummary.labels.from")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground/90">{inviterLine}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
            {t("teacher.substituteSummary.labels.session")} / {t("teacher.substituteSummary.labels.date")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground/90">{sessionLine}</p>
        </div>
      </div>
      {showInvitedSubstitute ? (
        <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 sm:px-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
            {t("teacher.substituteSummary.invitedSubstitute")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground/90">{rec.substituteEmailNorm}</p>
        </div>
      ) : null}
      {note ? (
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
            {t("teacher.substituteSummary.theirNote")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{note}</p>
        </div>
      ) : null}
    </div>
  );
}
