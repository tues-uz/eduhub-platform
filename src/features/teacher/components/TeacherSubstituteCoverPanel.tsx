import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowRight, ClipboardCheck, UserPlus } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { eduhubSubstituteInvites } from "@/api/eduhubClient";
import type { SubstituteInviteResponse, SubstituteInviteStatus } from "@/api/eduhubTypes";

function statusLabel(t: TFunction, status: SubstituteInviteStatus): string {
  switch (status) {
    case "PENDING_SUBSTITUTE_RESPONSE":
      return t("teacher.substitute.status.pendingSubstitute");
    case "PENDING_PRIMARY_APPROVAL":
      return t("teacher.substitute.status.pendingPrimary");
    case "PENDING_ADMIN_APPROVAL":
      return t("teacher.substitute.status.pendingAdmin");
    case "APPROVED":
      return t("teacher.substitute.status.approved");
    case "DECLINED_BY_SUBSTITUTE":
      return t("teacher.substitute.status.declinedBySubstitute");
    case "REJECTED_BY_PRIMARY":
      return t("teacher.substitute.status.rejectedByPrimary");
    case "REJECTED_BY_ADMIN":
      return t("teacher.substitute.status.rejectedByAdmin");
    case "CANCELLED_BY_PRIMARY":
      return t("teacher.substitute.status.cancelledByPrimary");
    default:
      return status;
  }
}

function statusTone(status: SubstituteInviteStatus, needsAction: boolean): string {
  if (needsAction) return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (
    status === "DECLINED_BY_SUBSTITUTE" ||
    status === "REJECTED_BY_PRIMARY" ||
    status === "REJECTED_BY_ADMIN" ||
    status === "CANCELLED_BY_PRIMARY"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

function teacherNeedsAction(rec: SubstituteInviteResponse, userId?: string): boolean {
  if (rec.substituteId === userId && rec.status === "PENDING_SUBSTITUTE_RESPONSE") return true;
  if (rec.primaryInstructorId === userId && rec.status === "PENDING_PRIMARY_APPROVAL") return true;
  return false;
}

function roleLabel(t: TFunction, rec: SubstituteInviteResponse, userId?: string): string {
  if (rec.substituteId === userId) return t("teacher.substitutePanel.role.youAreSubstitute");
  if (rec.primaryInstructorId === userId) return t("teacher.substitutePanel.role.youInvited");
  return t("teacher.substitutePanel.role.participant");
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  embedded?: boolean;
};

export function TeacherSubstituteCoverPanel({ embedded = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [rows, setRows] = useState<SubstituteInviteResponse[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    eduhubSubstituteInvites
      .listMine()
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = rows.filter((r) => teacherNeedsAction(r, user.id)).length;

  if (loading) {
    return (
      <div className={embedded ? "max-w-3xl" : undefined}>
        <p className="text-sm text-muted-foreground">{t("teacher.substitutePanel.loading")}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-red-200 bg-red-50">
          <UserPlus className="h-5 w-5 text-red-500" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("teacher.substitutePanel.error.title")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {t("teacher.substitutePanel.error.description")}
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-3xl rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border bg-background">
          <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("teacher.substitutePanel.empty.title")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {t("teacher.substitutePanel.empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? "max-w-3xl space-y-4" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pendingCount > 0
            ? t("teacher.substitutePanel.summary.needsResponse", { count: pendingCount })
            : t("teacher.substitutePanel.summary.track")}
        </p>
        {pendingCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
            {t("teacher.substitutePanel.summary.actionBadge", { count: pendingCount })}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {rows.map((rec) => {
          const needsAction = teacherNeedsAction(rec, user.id);
          const isSubstitute = rec.substituteId === user.id;
          const personLabel = isSubstitute
            ? t("teacher.substitutePanel.card.courseLead")
            : t("teacher.substitutePanel.card.substitute");
          const personValue = isSubstitute
            ? rec.primaryInstructorName
            : rec.substituteEmail;

          return (
            <article
              key={rec.id}
              className={`rounded-xl border bg-card p-4 sm:p-5 ${
                needsAction ? "border-amber-200 bg-amber-50/30" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {rec.courseTitle}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("teacher.substitutePanel.updated", {
                      datetime: formatUpdated(rec.updatedAt),
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusTone(
                    rec.status,
                    needsAction,
                  )}`}
                >
                  {statusLabel(t, rec.status)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("teacher.substitutePanel.card.yourRole")}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {roleLabel(t, rec, user.id)}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {personLabel}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-foreground" title={personValue}>
                    {personValue}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("teacher.substitutePanel.card.session")}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-foreground" title={rec.sessionNote?.trim() || undefined}>
                    {rec.sessionNote?.trim() || t("teacher.substitutePanel.card.wholeClass")}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
                {!isSubstitute ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/dashboard/teacher/courses/${rec.courseId}`}>
                      {t("teacher.substitutePanel.actions.openClass")}
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className={needsAction ? "bg-teal-700 hover:bg-teal-800" : undefined}
                  variant={needsAction ? "default" : "outline"}
                  asChild
                >
                  <Link
                    to={`/dashboard/teacher/substitute-requests/${rec.id}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    {needsAction ? (
                      <>
                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                        {t("teacher.substitutePanel.actions.review")}
                      </>
                    ) : (
                      <>
                        {t("teacher.substitutePanel.actions.viewDetails")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </>
                    )}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
