import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { SubstituteInviteRequestSummary } from "@/features/teacher/components/SubstituteInviteRequestSummary";
import { eduhubSubstituteInvites, ApiError } from "@/api/eduhubClient";
import type { SubstituteInviteResponse, SubstituteInviteStatus } from "@/api/eduhubTypes";
import { useTranslation } from "react-i18next";

function statusLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Waiting for substitute";
    case "PENDING_PRIMARY_APPROVAL":
      return "Waiting for primary instructor";
    case "PENDING_ADMIN_APPROVAL":
      return "With admin for final approval";
    case "APPROVED":
      return "Approved";
    case "DECLINED_BY_SUBSTITUTE":
      return "Declined by substitute";
    case "REJECTED_BY_PRIMARY":
      return "Rejected by primary instructor";
    case "REJECTED_BY_ADMIN":
      return "Rejected by admin";
    case "CANCELLED_BY_PRIMARY":
      return "Cancelled by primary instructor";
    default:
      return status;
  }
}

const CANCELLABLE_STATUSES: SubstituteInviteStatus[] = [
  "PENDING_SUBSTITUTE_RESPONSE",
  "PENDING_PRIMARY_APPROVAL",
  "PENDING_ADMIN_APPROVAL",
];

export default function TeacherSubstituteInviteReviewPage() {
  const { t } = useTranslation();
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [rec, setRec] = useState<SubstituteInviteResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const load = useCallback(() => {
    if (!inviteId) return;
    setLoading(true);
    eduhubSubstituteInvites
      .getById(inviteId)
      .then((r) => {
        setRec(r);
        setNotFound(false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [inviteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const decision = useMemo(() => {
    if (!rec) return { kind: "missing" as const };
    const isSubstitute = rec.substituteId === user.id;
    const isPrimary = rec.primaryInstructorId === user.id;

    if (rec.status === "PENDING_SUBSTITUTE_RESPONSE" && isSubstitute) {
      return { kind: "substitute_decide" as const, rec };
    }
    if (rec.status === "PENDING_PRIMARY_APPROVAL" && isPrimary) {
      return { kind: "primary_decide" as const, rec };
    }
    if (isSubstitute || isPrimary) {
      return { kind: "readonly_participant" as const, rec, isSubstitute, isPrimary };
    }
    return { kind: "no_access" as const, rec };
  }, [rec, user.id]);

  const goNotifications = () => navigate("/dashboard/teacher/notifications");

  const runAction = async (action: () => Promise<SubstituteInviteResponse>, successMessage: string) => {
    if (!inviteId) return;
    try {
      await action();
      toast.success(successMessage);
      goNotifications();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong");
      load();
    }
  };

  if (!inviteId) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <DashboardSidebar />
        <main
          className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
        >
          <div className="mx-auto max-w-lg px-6 py-10">
            <p className="text-sm text-foreground/70">Missing request id.</p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" asChild>
              <Link to="/dashboard/teacher/notifications">{t("teacher.substituteReview.backToNotifications")}</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!loading && (notFound || !rec)) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <DashboardSidebar />
        <main
          className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
        >
          <div className="mx-auto max-w-lg px-6 py-10">
            <p className="text-sm text-foreground/70">This cover request could not be found. It may have been removed.</p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" asChild>
              <Link to="/dashboard/teacher/notifications">{t("teacher.substituteReview.backToNotifications")}</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!rec) return null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div
          className="mx-auto box-border w-full max-w-xl px-6 pb-12"
          style={{
            paddingLeft: "clamp(1rem, 4vw, 1.75rem)",
            paddingRight: "clamp(1rem, 4vw, 1.75rem)",
          }}
        >
          <button
            type="button"
            onClick={goNotifications}
            className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />{t("common.notifications")}</button>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("teacher.substituteReview.title")}</h1>
          <p className="mt-1 text-sm text-foreground/65">Review details and respond when you are ready.</p>

          <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/40 p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">{t("common.status")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{statusLabel(rec.status)}</p>
            <div className="mt-6 border-t border-foreground/10 pt-6">
              <SubstituteInviteRequestSummary rec={rec} />
            </div>
          </div>

          {decision.kind === "substitute_decide" ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm leading-relaxed text-foreground/70">
                If you accept, the primary instructor will be asked to confirm before admin gives final approval.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-full bg-[#3954d0] hover:bg-[#2f46b3]"
                  onClick={() =>
                    runAction(() => eduhubSubstituteInvites.accept(inviteId), "You accepted the cover invite")
                  }
                >{t("teacher.substituteReview.acceptInvite")}</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => runAction(() => eduhubSubstituteInvites.decline(inviteId), "Invite declined")}
                >{t("teacher.substituteReview.declineInvite")}</Button>
              </div>
            </div>
          ) : null}

          {decision.kind === "primary_decide" ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm leading-relaxed text-foreground/70">
                The substitute has accepted. Approve to send this to admin for final sign-off, or reject to stop the request.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() =>
                    runAction(
                      () => eduhubSubstituteInvites.primaryApprove(inviteId),
                      "Forwarded to admin for final approval",
                    )
                  }
                >{t("teacher.substituteReview.approveCover")}</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    runAction(() => eduhubSubstituteInvites.primaryReject(inviteId), "Cover not approved")
                  }
                >{t("teacher.substituteReview.reject")}</Button>
              </div>
            </div>
          ) : null}

          {decision.kind === "readonly_participant" ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm leading-relaxed text-foreground/65">
                {decision.rec.status === "PENDING_SUBSTITUTE_RESPONSE" && decision.isPrimary
                  ? "Waiting for the substitute to respond. You will be notified when there is an update."
                  : decision.rec.status === "PENDING_PRIMARY_APPROVAL" && decision.isSubstitute
                    ? "Waiting for the primary instructor to confirm this cover."
                    : "There is nothing for you to confirm at this step. Check notifications for updates."}
              </p>
              {decision.isPrimary && CANCELLABLE_STATUSES.includes(decision.rec.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full text-red-700 hover:bg-red-50"
                  onClick={() =>
                    runAction(() => eduhubSubstituteInvites.cancel(inviteId), "Cover request cancelled")
                  }
                >
                  Cancel this request
                </Button>
              ) : null}
            </div>
          ) : null}

          {decision.kind === "no_access" ? (
            <p className="mt-6 text-sm text-amber-800/90">
              This cover request is not linked to your instructor account. If you think this is a mistake, open it from
              your latest notification.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
