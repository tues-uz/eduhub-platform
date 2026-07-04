import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { SubstituteInviteRequestSummary } from "@/features/teacher/components/SubstituteInviteRequestSummary";
import { useTranslation } from "react-i18next";
import { eduhubAdminSubstituteInvites, ApiError } from "@/api/eduhubClient";
import type { SubstituteInviteResponse, SubstituteInviteStatus } from "@/api/eduhubTypes";
import {
  ADMIN_SUBSTITUTE_REQUESTS_BASE,
} from "@/features/admin/substituteCoverAdminRoutes";

function statusLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Waiting for substitute";
    case "PENDING_PRIMARY_APPROVAL":
      return "Waiting for primary instructor";
    case "PENDING_ADMIN_APPROVAL":
      return "Ready for your final approval";
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

function adminCanDecideOnInvite(rec: SubstituteInviteResponse): boolean {
  return rec.status === "PENDING_ADMIN_APPROVAL";
}

function readonlyNote(rec: SubstituteInviteResponse): string {
  switch (rec.status) {
    case "PENDING_ADMIN_APPROVAL":
      return "";
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Waiting for the substitute to accept before this reaches admin approval.";
    case "PENDING_PRIMARY_APPROVAL":
      return "Waiting for the primary instructor to confirm before this reaches admin approval.";
    case "APPROVED":
      return "This substitute cover has been finalized.";
    case "REJECTED_BY_ADMIN":
      return "This request was rejected at the final admin step.";
    case "DECLINED_BY_SUBSTITUTE":
      return "The substitute declined; no admin approval is needed.";
    case "REJECTED_BY_PRIMARY":
      return "The primary instructor did not approve this cover.";
    case "CANCELLED_BY_PRIMARY":
      return "The primary instructor cancelled this request.";
    default:
      return "There is nothing for you to confirm at this step.";
  }
}

export default function AdminSubstituteInviteDetailPage() {
  const { t } = useTranslation();
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<SubstituteInviteResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!inviteId) return;
    setLoading(true);
    eduhubAdminSubstituteInvites
      .listAll()
      .then((rows) => {
        const found = rows.find((r) => r.id === inviteId);
        setRec(found);
        setNotFound(!found);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [inviteId]);

  useEffect(() => {
    load();
  }, [load]);

  const goNotifications = () => navigate("/dashboard/admin/notifications");

  const runAction = async (action: () => Promise<SubstituteInviteResponse>, successMessage: string) => {
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

  if (!loading && (notFound || !rec)) {
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

  if (!rec) return null;

  const canAdminDecide = adminCanDecideOnInvite(rec);
  const teachersHref = `/dashboard/admin/teachers?q=${encodeURIComponent(rec.substituteEmail)}`;
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
            ? "Both instructors have agreed. Use the buttons below to give final sign-off."
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
              Approve to record this cover in the system after both instructors agreed, or reject to stop it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() =>
                  runAction(
                    () => eduhubAdminSubstituteInvites.approve(rec.id),
                    t("admin.substituteCover.toast.finalized"),
                  )
                }
              >
                {t("admin.substituteCover.detail.finalApprove")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-emerald-300 bg-white hover:bg-emerald-50"
                onClick={() =>
                  runAction(() => eduhubAdminSubstituteInvites.reject(rec.id), t("admin.substituteCover.toast.rejected"))
                }
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
