import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { SubstituteInviteRequestSummary } from "@/features/teacher/components/SubstituteInviteRequestSummary";
import { useTranslation } from "react-i18next";
import {
  substituteInviteWorkflowStore,
  type SubstituteInviteRecord,
  type SubstituteInviteStatus,
} from "@/features/teacher/data/substituteInviteWorkflowStore";
import {
  ADMIN_SUBSTITUTE_REQUESTS_BASE,
  resolveAdminSubstituteInviteId,
} from "@/features/admin/substituteCoverAdminRoutes";
import {
  appNotificationStore,
  APP_NOTIFICATIONS_CHANGE_EVENT,
  notifyInviterSubstituteFinalizedByAdmin,
  notifySubstituteCoverFullyApproved,
  notifyAdminRejectedSubstituteCover,
} from "@/features/notifications/appNotificationStore";

function statusLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "pending_substitute_response":
      return "Waiting for substitute";
    case "pending_primary_approval":
      return "Waiting for primary instructor";
    case "pending_admin_approval":
      return "Ready for your final approval";
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

function markAdminInviteNotificationsRead(inviteId: string) {
  for (const n of appNotificationStore.listForAdmin()) {
    if (resolveAdminSubstituteInviteId(n) === inviteId && !n.read) {
      appNotificationStore.markRead(n.id);
    }
  }
}

function adminCanDecideOnInvite(rec: SubstituteInviteRecord): boolean {
  return (
    rec.status === "pending_admin_approval" ||
    rec.status === "pending_substitute_response" ||
    rec.status === "pending_primary_approval"
  );
}

function readonlyNote(rec: SubstituteInviteRecord): string {
  switch (rec.status) {
    case "pending_admin_approval":
    case "pending_substitute_response":
    case "pending_primary_approval":
      return "";
    case "approved":
      return "This substitute cover has been finalized.";
    case "rejected_by_admin":
      return "This request was rejected at the final admin step.";
    case "declined_by_substitute":
      return "The substitute declined; no admin approval is needed.";
    case "rejected_by_primary":
      return "The primary instructor did not approve this cover.";
    default:
      return "There is nothing for you to confirm at this step.";
  }
}

export default function AdminSubstituteInviteDetailPage() {
  const { t } = useTranslation();
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
  }, [bump]);

  const rec = useMemo(() => {
    void tick;
    if (!inviteId) return undefined;
    return substituteInviteWorkflowStore.get(inviteId);
  }, [inviteId, tick]);

  const goNotifications = () => navigate("/dashboard/admin/notifications");

  if (!inviteId) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-lg px-6 py-10">
          <p className="text-sm text-slate-600">{t("admin.substituteCover.detail.missingId")}</p>
          <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={goNotifications}>
            Back to notifications
          </Button>
        </div>
      </AdminLayout>
    );
  }

  if (!rec) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-lg px-6 py-10">
          <p className="text-sm text-slate-600">{t("admin.substituteCover.detail.notFound")}</p>
          <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={goNotifications}>
            Back to notifications
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const canAdminDecide = adminCanDecideOnInvite(rec);
  const isFinalAdminStep = rec.status === "pending_admin_approval";
  const teachersHref = `/dashboard/admin/teachers?q=${encodeURIComponent(rec.substituteEmailNorm)}`;
  const foot = readonlyNote(rec);

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-xl px-6 pb-14">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            onClick={goNotifications}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Notifications
          </button>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <Link to={ADMIN_SUBSTITUTE_REQUESTS_BASE} className="font-medium text-[#3954d0] hover:underline">
            All substitute requests
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("admin.substituteCover.detail.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {canAdminDecide
            ? isFinalAdminStep
              ? "Both instructors have agreed. Use the buttons below to give final sign-off."
              : "The invite is still with instructors. You can still approve or reject this substitute cover below (demo: admin may decide at any time before it is finalized)."
            : t("admin.substituteCover.detail.descriptionClosed")}
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("common.status")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{statusLabel(rec.status)}</p>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <SubstituteInviteRequestSummary rec={rec} showInvitedSubstitute />
          </div>
        </div>

        {canAdminDecide ? (
          <div className="mt-6 space-y-3 rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 sm:p-5">
            <p className="text-sm font-semibold text-emerald-950">{t("admin.substituteCover.detail.adminDecision")}</p>
            <p className="text-sm leading-relaxed text-emerald-900/90">
              {isFinalAdminStep
                ? "Approve to record this cover in the system after both instructors agreed, or reject to stop it."
                : t("admin.substituteCover.detail.adminDecisionEarly")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  const r = substituteInviteWorkflowStore.approveByAdmin(rec.id);
                  if (!r.ok) {
                    toast.error("reason" in r ? r.reason : "Could not approve substitute cover");
                    bump();
                    return;
                  }
                  notifySubstituteCoverFullyApproved(r.record);
                  notifyInviterSubstituteFinalizedByAdmin(r.record);
                  markAdminInviteNotificationsRead(rec.id);
                  toast.success(isFinalAdminStep ? t("admin.substituteCover.toast.finalized") : "Substitute cover approved");
                  bump();
                  goNotifications();
                }}
              >
                {isFinalAdminStep ? t("admin.substituteCover.detail.finalApprove") : t("admin.substituteCover.detail.approveCover")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-emerald-300 bg-white hover:bg-emerald-50"
                onClick={() => {
                  const r = substituteInviteWorkflowStore.rejectByAdmin(rec.id);
                  if (!r.ok) {
                    toast.error("reason" in r ? r.reason : "Could not reject substitute cover");
                    bump();
                    return;
                  }
                  notifyAdminRejectedSubstituteCover(r.record);
                  markAdminInviteNotificationsRead(rec.id);
                  toast.message(t("admin.substituteCover.toast.rejected"));
                  bump();
                  goNotifications();
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        ) : foot ? (
          <p className="mt-6 text-sm leading-relaxed text-slate-600">{foot}</p>
        ) : null}

        <div className="mt-8">
          <Button type="button" variant="outline" size="sm" className="rounded-full" asChild>
            <Link to={teachersHref}>{t("admin.substituteCover.detail.viewInTeachers")}</Link>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
