import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ClipboardCheck, UserPlus } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthSession } from "@/features/auth/context";
import {
  substituteInviteWorkflowStore,
  type SubstituteInviteRecord,
  type SubstituteInviteStatus,
} from "@/features/teacher/data/substituteInviteWorkflowStore";
import { APP_NOTIFICATIONS_CHANGE_EVENT } from "@/features/notifications/appNotificationStore";

function statusLabel(t: TFunction, status: SubstituteInviteStatus): string {
  switch (status) {
    case "pending_substitute_response":
      return t("teacher.substitute.status.pendingSubstitute");
    case "pending_primary_approval":
      return t("teacher.substitute.status.pendingPrimary");
    case "pending_admin_approval":
      return t("teacher.substitute.status.pendingAdmin");
    case "approved":
      return t("teacher.substitute.status.approved");
    case "declined_by_substitute":
      return t("teacher.substitute.status.declinedBySubstitute");
    case "rejected_by_primary":
      return t("teacher.substitute.status.rejectedByPrimary");
    case "rejected_by_admin":
      return t("teacher.substitute.status.rejectedByAdmin");
    default:
      return status;
  }
}

function statusPillClass(status: SubstituteInviteStatus, needsAction: boolean): string {
  if (needsAction) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "approved") return "bg-green-50 text-green-800 ring-green-200";
  if (status === "declined_by_substitute" || status === "rejected_by_primary" || status === "rejected_by_admin") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function teacherNeedsAction(rec: SubstituteInviteRecord, emailNorm: string): boolean {
  if (rec.substituteEmailNorm === emailNorm && rec.status === "pending_substitute_response") return true;
  if (rec.primaryInstructorEmailNorm === emailNorm && rec.status === "pending_primary_approval") return true;
  return false;
}

function roleLabel(t: TFunction, rec: SubstituteInviteRecord, emailNorm: string): string {
  if (rec.substituteEmailNorm === emailNorm) return t("teacher.substitutePanel.role.youAreSubstitute");
  if (rec.primaryInstructorEmailNorm === emailNorm) return t("teacher.substitutePanel.role.youInvited");
  return t("teacher.substitutePanel.role.participant");
}

type Props = {
  embedded?: boolean;
};

export function TeacherSubstituteCoverPanel({ embedded = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    const onWorkflow = () => bump();
    window.addEventListener("eduhub.substituteInviteWorkflow.changed", onWorkflow);
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => {
      window.removeEventListener("eduhub.substituteInviteWorkflow.changed", onWorkflow);
      window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    };
  }, [bump]);

  const rows = useMemo(() => {
    void tick;
    return substituteInviteWorkflowStore
      .listAll()
      .filter(
        (r) => r.primaryInstructorEmailNorm === emailNorm || r.substituteEmailNorm === emailNorm,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [emailNorm, tick]);

  const pendingCount = rows.filter((r) => teacherNeedsAction(r, emailNorm)).length;

  if (rows.length === 0) {
    return (
      <Card className="border-dashed border-2 max-w-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <UserPlus className="h-14 w-14 text-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">{t("teacher.substitutePanel.empty.title")}</h3>
          <p className="text-sm text-foreground/60 mb-6 max-w-sm">
            {t("teacher.substitutePanel.empty.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={embedded ? "max-w-3xl" : undefined}>
      <p className="text-sm text-foreground/60 mb-4">
        {pendingCount > 0 ? (
          t("teacher.substitutePanel.summary.needsResponse", { count: pendingCount })
        ) : (
          t("teacher.substitutePanel.summary.track")
        )}
      </p>

      <div className="space-y-3 max-w-3xl">
        {rows.map((rec) => {
          const needsAction = teacherNeedsAction(rec, emailNorm);
          const isSubstitute = rec.substituteEmailNorm === emailNorm;
          return (
            <Card key={rec.id} className="rounded-2xl border-slate-200/90 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2">{rec.courseTitle}</CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <span className="block text-sm text-slate-600">
                        {isSubstitute ? (
                          <>
                            {t("teacher.substitutePanel.card.courseLead")}{" "}
                            <span className="font-medium text-slate-800">{rec.primaryInstructorName}</span>
                          </>
                        ) : (
                          <>
                            {t("teacher.substitutePanel.card.substitute")}{" "}
                            <span className="font-mono text-xs font-medium text-slate-800">{rec.substituteEmailNorm}</span>
                          </>
                        )}
                      </span>
                      {rec.sessionNote ? (
                        <span className="block text-xs text-slate-500">{rec.sessionNote}</span>
                      ) : null}
                      <span className="block text-xs text-slate-500">
                        {roleLabel(t, rec, emailNorm)} ·{" "}
                        {t("teacher.substitutePanel.updated", {
                          datetime: new Date(rec.updatedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }),
                        })}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusPillClass(
                        rec.status,
                        needsAction,
                      )}`}
                    >
                      {statusLabel(t, rec.status)}
                    </span>
                    <Button size="sm" className="rounded-full bg-[#1e40af] hover:bg-[#1e3a8a]" asChild>
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
                          t("teacher.substitutePanel.actions.viewDetails")
                        )}
                      </Link>
                    </Button>
                    {!isSubstitute ? (
                      <Button size="sm" variant="outline" className="rounded-full" asChild>
                        <Link to={`/dashboard/teacher/courses/${rec.courseId}`}>
                          {t("teacher.substitutePanel.actions.openClass")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
