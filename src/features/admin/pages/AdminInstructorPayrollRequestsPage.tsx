import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { buildPayrollProofPagePath } from "@/features/admin/data/adminPayrollProofStore";
import { useTranslation } from "react-i18next";
import {
  instructorPayrollRequestStore,
  useInstructorPayrollRequests,
} from "@/features/teacher/data/instructorPayrollRequestStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatThousandsInText } from "@/lib/utils";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";

export default function AdminInstructorPayrollRequestsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const payrollRequests = useInstructorPayrollRequests();
  const pendingPayrollRequests = useMemo(
    () => payrollRequests.filter((r) => r.status === "pending"),
    [payrollRequests],
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();

  const requireAdminCode = (): string | null => {
    try {
      return validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return null;
    }
  };

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw.startsWith("request-")) return;
    const id = raw.slice("request-".length);
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(`request-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-3xl">
        <Link
          to="/dashboard/admin/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payroll overview
        </Link>

        <AdminPageHeader
          title={t("admin.instructorPayrollRequests.title")}
          description={t("admin.instructorPayrollRequests.description")}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/payroll/submissions">{t("admin.instructorPayrollRequests.payoutProofLog")}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/payments">{t("admin.dashboard.quickActions.paymentsReminders")}</Link>
              </Button>
            </div>
          }
        />

        {pendingPayrollRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-800">{t("admin.instructorPayrollRequests.emptyTitle")}</p>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              When an instructor submits payroll for a class, it appears here for approval and transfer proof.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/dashboard/admin/payroll">{t("admin.instructorPayrollRequests.openPayrollOverview")}</Link>
            </Button>
          </div>
        ) : (
          <Card className="rounded-xl border-amber-200/90 bg-amber-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">Pending ({pendingPayrollRequests.length})</CardTitle>
              <p className="text-sm text-slate-600 font-normal">
                <strong className="font-medium text-slate-800">1.</strong> Approve or reject (optional note on reject).{" "}
                <strong className="font-medium text-slate-800">2.</strong> After you pay them, open{" "}
                <span className="font-medium text-slate-800">{t("admin.instructorPayrollRequests.recordTransferProof")}</span> (or use{" "}
                <span className="font-medium text-slate-800">Upload payout proof</span> on a class card on Payroll overview).
                Submitting proof sends an in-app notification to the instructor.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <AdminActionCodeField
                id="payroll-list-admin-code"
                value={adminActionCode}
                onChange={setAdminActionCode}
                className="rounded-lg border border-amber-200/80 bg-white p-4"
              />
              {pendingPayrollRequests.map((r) => (
                <div
                  key={r.id}
                  id={`request-${r.id}`}
                  className="rounded-lg border border-amber-200/80 bg-white p-4 shadow-sm space-y-3 scroll-mt-28"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.classSection} · {r.course}
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {r.instructorName}
                        {r.instructorEmailNorm ? (
                          <span className="text-slate-500"> · {r.instructorEmailNorm}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted{" "}
                        {new Date(r.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link to={`/dashboard/admin/payroll/instructor-request/${r.id}`}>{t("admin.shared.openDetails")}</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={async () => {
                          const code = requireAdminCode();
                          if (!code) return;
                          const ok = await instructorPayrollRequestStore.approve(r.id, code);
                          if (ok) toast.success(t("admin.instructorPayrollRequests.toast.approved"), { description: r.instructorName });
                          else toast.error(t("admin.installmentPayments.toast.approveFailed"), { description: "Request may have been removed." });
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          const code = requireAdminCode();
                          if (!code) return;
                          const note = rejectNotes[r.id]?.trim();
                          const ok = await instructorPayrollRequestStore.reject(r.id, code, note);
                          if (ok) {
                            toast.message(t("admin.instructorPayrollRequests.toast.rejected"), { description: r.instructorName });
                            setRejectNotes((prev) => {
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                          } else toast.error(t("admin.installmentPayments.toast.rejectFailed"));
                        }}
                      >
                        Reject
                      </Button>
                      <Button type="button" size="sm" variant="secondary" asChild>
                        <Link
                          to={buildPayrollProofPagePath(
                            r.classSection,
                            r.course,
                            r.instructorName,
                            r.instructorEmailNorm,
                          )}
                        >
                          Record transfer proof
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{r.summary}</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {r.periodLabel ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">{t("admin.shared.period")}</dt>
                        <dd className="text-slate-800">{r.periodLabel}</dd>
                      </div>
                    ) : null}
                    {r.sessionsTaught ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">{t("admin.instructorPayrollRequests.fields.sessionsTaught")}</dt>
                        <dd className="text-slate-800">{r.sessionsTaught}</dd>
                      </div>
                    ) : null}
                    {r.requestedPayout ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">{t("admin.instructorPayrollRequests.fields.requestedPayout")}</dt>
                        <dd className="text-slate-800 tabular-nums">{formatThousandsInText(r.requestedPayout)}</dd>
                      </div>
                    ) : null}
                    {r.payoutDetails ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">{t("admin.instructorPayrollRequests.fields.payoutDetails")}</dt>
                        <dd className="text-slate-800">{r.payoutDetails}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {r.instructorNotes ? (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Instructor notes: </span>
                      {r.instructorNotes}
                    </p>
                  ) : null}
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor={`reject-${r.id}`}>
                      Optional note to instructor (shown on reject)
                    </label>
                    <Textarea
                      id={`reject-${r.id}`}
                      value={rejectNotes[r.id] ?? ""}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                      placeholder={t("admin.instructorPayrollRequests.rejectNotePlaceholder")}
                      className="mt-1 bg-white min-h-[72px]"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
