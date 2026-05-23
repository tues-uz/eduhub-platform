import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { SubstituteInviteRequestSummary } from "@/features/teacher/components/SubstituteInviteRequestSummary";
import {
  substituteInviteWorkflowStore,
  type SubstituteInviteRecord,
  type SubstituteInviteStatus,
} from "@/features/teacher/data/substituteInviteWorkflowStore";
import {
  appNotificationStore,
  APP_NOTIFICATIONS_CHANGE_EVENT,
  notifyAdminSubstituteInviteDeclined,
  notifyAfterPrimaryApprovedPendingAdmin,
  notifySubstituteAcceptedAwaitingPrimary,
  notifySubstituteDeclinedPrimary,
  notifySubstituteRejectedByPrimary,
  notifySubstituteWaitingPrimaryApproval,
} from "@/features/notifications/appNotificationStore";

function statusLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "pending_substitute_response":
      return "Waiting for substitute";
    case "pending_primary_approval":
      return "Waiting for primary instructor";
    case "pending_admin_approval":
      return "With admin for final approval";
    case "approved":
      return "Approved";
    case "declined_by_substitute":
      return "Declined by substitute";
    case "rejected_by_primary":
      return "Rejected by primary instructor";
    case "rejected_by_admin":
      return "Rejected by admin";
    default:
      return status;
  }
}

export default function TeacherSubstituteInviteReviewPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const [tick, setTick] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const bump = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
  }, [bump]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const rec = useMemo(() => {
    void tick;
    if (!inviteId) return undefined;
    return substituteInviteWorkflowStore.get(inviteId);
  }, [inviteId, tick]);

  const decision = useMemo(() => {
    if (!rec) return { kind: "missing" as const };
    const isSubstitute = rec.substituteEmailNorm === emailNorm;
    const isPrimary = rec.primaryInstructorEmailNorm === emailNorm;

    if (rec.status === "pending_substitute_response" && isSubstitute) {
      return { kind: "substitute_decide" as const, rec };
    }
    if (rec.status === "pending_primary_approval" && isPrimary) {
      return { kind: "primary_decide" as const, rec };
    }
    if (isSubstitute || isPrimary) {
      return { kind: "readonly_participant" as const, rec, isSubstitute, isPrimary };
    }
    return { kind: "no_access" as const, rec };
  }, [rec, emailNorm]);

  const goNotifications = () => navigate("/dashboard/teacher/notifications");

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
              <Link to="/dashboard/teacher/notifications">Back to notifications</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!rec) {
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
              <Link to="/dashboard/teacher/notifications">Back to notifications</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const markRelatedRead = (row: SubstituteInviteRecord) => {
    const list = appNotificationStore.listForInstructor(emailNorm, user.name);
    for (const n of list) {
      if (n.refId === row.id && !n.read) {
        appNotificationStore.markRead(n.id);
      }
    }
  };

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
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Notifications
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cover request</h1>
          <p className="mt-1 text-sm text-foreground/65">Review details and respond when you are ready.</p>

          <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/40 p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">Status</p>
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
                  onClick={() => {
                    const r = substituteInviteWorkflowStore.acceptBySubstitute(rec.id, emailNorm);
                    if (!r.ok) {
                      toast.error("reason" in r ? r.reason : "Could not accept invite");
                      bump();
                      return;
                    }
                    notifySubstituteAcceptedAwaitingPrimary(r.record);
                    notifySubstituteWaitingPrimaryApproval(r.record);
                    markRelatedRead(r.record);
                    toast.success("You accepted the cover invite");
                    bump();
                    goNotifications();
                  }}
                >
                  Accept invite
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    const r = substituteInviteWorkflowStore.declineBySubstitute(rec.id, emailNorm);
                    if (!r.ok) {
                      toast.error("reason" in r ? r.reason : "Could not decline invite");
                      bump();
                      return;
                    }
                    notifySubstituteDeclinedPrimary(r.record);
                    notifyAdminSubstituteInviteDeclined(r.record);
                    markRelatedRead(r.record);
                    toast.message("Invite declined");
                    bump();
                    goNotifications();
                  }}
                >
                  Decline invite
                </Button>
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
                  onClick={() => {
                    const r = substituteInviteWorkflowStore.approveByPrimary(rec.id, emailNorm);
                    if (!r.ok) {
                      toast.error("reason" in r ? r.reason : "Could not approve cover");
                      bump();
                      return;
                    }
                    notifyAfterPrimaryApprovedPendingAdmin(r.record);
                    markRelatedRead(r.record);
                    toast.success("Forwarded to admin for final approval");
                    bump();
                    goNotifications();
                  }}
                >
                  Approve cover
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    const r = substituteInviteWorkflowStore.rejectByPrimary(rec.id, emailNorm);
                    if (!r.ok) {
                      toast.error("reason" in r ? r.reason : "Could not reject cover");
                      bump();
                      return;
                    }
                    notifySubstituteRejectedByPrimary(r.record);
                    markRelatedRead(r.record);
                    toast.message("Cover not approved");
                    bump();
                    goNotifications();
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}

          {decision.kind === "readonly_participant" ? (
            <p className="mt-6 text-sm leading-relaxed text-foreground/65">
              {decision.rec.status === "pending_substitute_response" && decision.isPrimary
                ? "Waiting for the substitute to respond. You will be notified when there is an update."
                : decision.rec.status === "pending_primary_approval" && decision.isSubstitute
                  ? "Waiting for the primary instructor to confirm this cover."
                  : "There is nothing for you to confirm at this step. Check notifications for updates."}
            </p>
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
