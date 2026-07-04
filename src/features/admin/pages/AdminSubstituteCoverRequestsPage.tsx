import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardCheck } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminSubstituteDetailHref } from "@/features/admin/substituteCoverAdminRoutes";
import { useTranslation } from "react-i18next";
import { eduhubAdminSubstituteInvites } from "@/api/eduhubClient";
import type { SubstituteInviteResponse, SubstituteInviteStatus } from "@/api/eduhubTypes";

function statusLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Waiting for substitute";
    case "PENDING_PRIMARY_APPROVAL":
      return "Waiting for primary";
    case "PENDING_ADMIN_APPROVAL":
      return "Needs admin approval";
    case "APPROVED":
      return "Approved";
    case "DECLINED_BY_SUBSTITUTE":
      return "Declined (substitute)";
    case "REJECTED_BY_PRIMARY":
      return "Rejected (primary)";
    case "REJECTED_BY_ADMIN":
      return "Rejected (admin)";
    default:
      return status;
  }
}

function adminListCanActOnStatus(status: SubstituteInviteStatus): boolean {
  return (
    status === "PENDING_ADMIN_APPROVAL" ||
    status === "PENDING_SUBSTITUTE_RESPONSE" ||
    status === "PENDING_PRIMARY_APPROVAL"
  );
}

function statusPillClass(status: SubstituteInviteStatus): string {
  if (adminListCanActOnStatus(status)) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "APPROVED") return "bg-green-50 text-green-800 ring-green-200";
  if (status === "DECLINED_BY_SUBSTITUTE" || status === "REJECTED_BY_PRIMARY" || status === "REJECTED_BY_ADMIN") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function AdminSubstituteCoverRequestsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SubstituteInviteResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    eduhubAdminSubstituteInvites
      .listAll()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-3xl px-6 pb-14">
        <Link
          to="/dashboard/admin/notifications"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Notifications
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("adminNav.substituteRequests")}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Open a request to see full details. When both instructors agree, you can give final approval on the
              request page.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              No substitute cover requests yet. They appear here when an instructor sends a substitute invite.
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{r.courseTitle}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {r.primaryInstructorName} → {r.substituteEmail}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Updated {new Date(r.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusPillClass(
                      r.status,
                    )}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                  <Button size="sm" className="rounded-full bg-[#3954d0] hover:bg-[#2f46b3]" asChild>
                    <Link to={adminSubstituteDetailHref(r.id)} className="inline-flex items-center gap-1.5">
                      {adminListCanActOnStatus(r.status) ? (
                        <>
                          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                          Review & approve
                        </>
                      ) : (
                        "View details"
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
