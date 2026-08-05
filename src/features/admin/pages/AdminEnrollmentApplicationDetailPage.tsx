import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { eduhubAdminEnrollmentApplications, eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import { buildScheduleMonthTabs, orderSessionSlotsChronologically } from "@/features/courses/classSchedulePreview";
import { approveEnrollmentApplication } from "@/features/enrollment/enrollmentApproval";
import { enrichEnrollmentApplication } from "@/features/enrollment/enrollmentDocuments";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  enrollmentRequiresVerificationUploads,
  formatPaymentMethodLabel,
} from "@/features/enrollment/enrollmentDocumentConfig";
import {
  buildEnrollmentPaymentDisplay,
  enrollmentPaymentListSummary,
  formatEnrollmentMoney,
} from "@/features/enrollment/enrollmentPaymentDisplay";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { formatReviewedByLabel, validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import { AdminEnrollmentPaidMonthsPanel } from "@/features/admin/components/AdminEnrollmentPaidMonthsPanel";
import { EnrollmentPaymentHistorySection } from "@/features/enrollment/EnrollmentPaymentHistorySection";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminEnrollmentApplicationDetailPage() {
  const { t } = useTranslation();
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EnrollmentApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();
  const [listedTuition, setListedTuition] = useState<number | null>(null);
  const [listedCurrency, setListedCurrency] = useState("USD");
  const [coursePriceLoading, setCoursePriceLoading] = useState(false);
  const [scheduleMonthCount, setScheduleMonthCount] = useState<number | undefined>();

  const fetchRecord = useCallback(() => {
    if (!applicationId) {
      setRecord(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    eduhubAdminEnrollmentApplications
      .get(applicationId)
      .then(setRecord)
      .catch(() => {
        setRecord(null);
        toast.error(t("admin.enrollmentApplications.detail.toast.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  useEffect(() => {
    if (!record?.courseId || !isUuid(record.courseId)) {
      setListedTuition(null);
      setScheduleMonthCount(undefined);
      setCoursePriceLoading(false);
      return;
    }
    setCoursePriceLoading(true);
    Promise.all([
      eduhubCourses.getById(record.courseId),
      eduhubSchedule.getProposal(record.courseId).catch(() => null),
    ])
      .then(([c, proposal]) => {
        const amt = c.pricing?.discountedAmount ?? c.pricing?.amount;
        const cur = c.pricing?.currency ?? "USD";
        setListedCurrency(cur);
        setListedTuition(amt != null && amt > 0 ? amt : null);
        const slots = buildCourseScheduleSlots(c, proposal, record.courseId);
        const tabs = buildScheduleMonthTabs(orderSessionSlotsChronologically(slots));
        setScheduleMonthCount(tabs.length > 0 ? tabs.length : undefined);
      })
      .catch(() => {
        setListedTuition(null);
        setScheduleMonthCount(undefined);
      })
      .finally(() => setCoursePriceLoading(false));
  }, [record?.courseId]);

  const approve = async () => {
    if (!record || record.status !== "PENDING") return;
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return;
    }
    setBusy(true);
    try {
      await approveEnrollmentApplication(record.id, {
        listedTuition: listedTuition ?? undefined,
        adminActionCode: code,
      });
      toast.success(t("admin.shared.approved"), {
        description: "Student enrolled. Invoice and receipt are available in their Payment history.",
      });
      navigate("/dashboard/admin/enrollment-applications");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(t("admin.enrollmentApplications.detail.toast.approveFailed"), { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!record) return;
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return;
    }
    setBusy(true);
    try {
      await eduhubAdminEnrollmentApplications.reject(record.id, {
        adminNote: rejectNote.trim() || undefined,
        adminActionCode: code,
      });
      toast.message(t("admin.enrollmentApplications.detail.toast.rejectedTitle"), {
        description: "The student can submit again if needed.",
      });
      setRejectOpen(false);
      navigate("/dashboard/admin/enrollment-applications");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(t("admin.enrollmentApplications.detail.toast.rejectFailed"), { description: msg });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">{t("admin.shared.loadingApplication")}</span>
        </div>
    );
  }

  if (!applicationId) {
    return (
        <div className="container mx-auto px-6 py-8">
          <p className="text-slate-600">{t("admin.enrollmentApplications.detail.notFound.missing")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard/admin/enrollment-applications">{t("admin.shared.backToList")}</Link>
          </Button>
        </div>
    );
  }

  const displayRecord = record ? enrichEnrollmentApplication(record) : null;

  if (!record) {
    return (
        <div className="container mx-auto max-w-2xl px-6 py-8">
          <Link
            to="/dashboard/admin/enrollment-applications"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to enrollment applications
          </Link>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">{t("admin.enrollmentApplications.detail.notFound.title")}</h1>
            <p className="mt-2 text-sm text-slate-600">
              It may have been removed or the link is invalid.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard/admin/enrollment-applications">{t("admin.shared.returnToList")}</Link>
            </Button>
          </div>
        </div>
    );
  }

  return (
      <>
      <div className="container mx-auto max-w-3xl px-6 pb-16 pt-2">
        <Link
          to="/dashboard/admin/enrollment-applications"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to enrollment applications
        </Link>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t("admin.enrollmentApplications.detail.eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("admin.enrollmentApplications.detail.title")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Verify contact details, full or down payment (schedule-based tuition), and open proof / ID before
            approving or rejecting.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    record.status === "PENDING"
                      ? "bg-amber-100 text-amber-900"
                      : record.status === "APPROVED"
                        ? "bg-green-100 text-green-900"
                        : "bg-red-100 text-red-900"
                  }`}
                >
                  {record.status}
                </span>
                <span className="text-sm text-slate-500">Submitted {formatDate(record.submittedAt)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 text-sm">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("admin.shared.class")}</p>
              <p className="mt-1 font-medium text-slate-900">{record.courseTitle ?? record.courseId}</p>
              <p className="mt-1 text-xs text-slate-500 break-all font-mono">{record.courseId}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("admin.shared.student")}</p>
              <p className="mt-1 font-medium text-slate-900">{record.fullName}</p>
              <p className="text-slate-600 break-all">{record.email}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("admin.enrollmentApplications.detail.sections.contact")}</p>
              <p className="mt-1">{record.phone}</p>
              {record.phoneSecondary ? <p className="text-slate-600">{record.phoneSecondary}</p> : null}
              <p className="mt-2 text-slate-700 whitespace-pre-wrap">{record.address}</p>
            </div>

            {displayRecord?.invoiceNumber || displayRecord?.receiptNumber ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  Official documents
                </p>
                {displayRecord.invoiceNumber ? (
                  <p className="mt-1 font-mono text-xs text-slate-900">Invoice: {displayRecord.invoiceNumber}</p>
                ) : null}
                {displayRecord.receiptNumber ? (
                  <p className="mt-0.5 font-mono text-xs text-slate-900">Receipt: {displayRecord.receiptNumber}</p>
                ) : null}
                {displayRecord.paymentMethod ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Method: {formatPaymentMethodLabel(displayRecord.paymentMethod)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {(() => {
              const pay = buildEnrollmentPaymentDisplay(record, listedTuition, scheduleMonthCount);
              const moneyCur = pay.listedTuition != null ? listedCurrency : pay.currency;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("admin.enrollments.paymentPlaceholder")}</p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">{t("admin.enrollmentApplications.detail.sections.paymentMethod")}</dt>
                      <dd className="font-medium text-slate-900">{pay.methodLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        {record.status === "APPROVED" ? t("admin.enrollmentApplications.detail.sections.monthsPaidAtEnrollment") : t("admin.enrollmentApplications.detail.sections.monthsPaid")}
                      </dt>
                      <dd className="font-medium text-slate-900">{pay.planLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        {enrollmentRequiresVerificationUploads(record.paymentMethod)
                          ? "Amount on transfer"
                          : t("admin.shared.amount")}
                      </dt>
                      <dd className="font-semibold tabular-nums text-slate-900">
                        {pay.declaredAmount != null && pay.declaredAmount > 0
                          ? formatEnrollmentMoney(pay.declaredAmount, pay.currency)
                          : "—"}
                      </dd>
                    </div>
                    {pay.installmentCount != null ? (
                      <div>
                        <dt className="text-xs text-slate-500">{t("admin.enrollmentApplications.detail.sections.furtherInstalments")}</dt>
                        <dd className="text-slate-900">{pay.installmentCount} payments (school policy)</dd>
                      </div>
                    ) : null}
                    {pay.scheduleScope ? (
                      <div className={pay.installmentCount != null ? "" : "sm:col-span-2"}>
                        <dt className="text-xs text-slate-500">{t("admin.courses.detail.schedule")}</dt>
                        <dd className="text-slate-900">{pay.scheduleScope}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {coursePriceLoading ? (
                    <p className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Loading listed class price…
                    </p>
                  ) : pay.listedTuition != null ? (
                    <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                      <p className="text-slate-600">
                        Listed class price:{" "}
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatEnrollmentMoney(pay.listedTuition, moneyCur)}
                        </span>
                      </p>
                      {pay.proratedTuition != null ? (
                        <p className="text-slate-700">
                          Student tuition (prorated):{" "}
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatEnrollmentMoney(pay.proratedTuition, moneyCur)}
                          </span>
                        </p>
                      ) : null}
                      {pay.expectedTransfer != null &&
                      pay.declaredAmount != null &&
                      pay.declaredAmount !== pay.expectedTransfer ? (
                        <p className="text-slate-600">
                          Expected for this plan:{" "}
                          <span className="font-medium tabular-nums">
                            {formatEnrollmentMoney(pay.expectedTransfer, moneyCur)}
                          </span>
                        </p>
                      ) : null}
                      {pay.amountMatches === false ? (
                        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-950">
                          Transfer amount does not match expected tuition for this plan — check the payment proof.
                        </p>
                      ) : pay.amountMatches === true ? (
                        <p className="text-xs font-medium text-emerald-800">
                          Transfer amount matches expected tuition.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Listed class price not available for this course. Summary:{" "}
                      <span className="font-medium text-slate-700">{enrollmentPaymentListSummary(record)}</span>
                    </p>
                  )}
                </div>
              );
            })()}

            {enrollmentRequiresVerificationUploads(record.paymentMethod) ? (
              <div className="flex flex-wrap gap-8 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Payment proof
                  </p>
                  {record.paymentProofUrl && /^https?:\/\//i.test(record.paymentProofUrl) ? (
                    <a
                      href={record.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Open proof in new tab
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    ID document
                  </p>
                  {record.idCardUrl && /^https?:\/\//i.test(record.idCardUrl) ? (
                    <a
                      href={record.idCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Open ID in new tab
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="border-t border-slate-100 pt-4 text-sm text-slate-600">
                {formatPaymentMethodLabel(record.paymentMethod)} — no transfer proof or ID upload required.
              </p>
            )}

            {record.status === "APPROVED" ? (
              <>
                <EnrollmentPaymentHistorySection
                  record={record}
                  variant="admin"
                  listedTuition={listedTuition}
                />
                <AdminEnrollmentPaidMonthsPanel record={record} />
              </>
            ) : null}

            {record.adminNote ? (
              <div className="rounded-lg border border-red-100 bg-red-50/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800">{t("admin.enrollmentApplications.detail.sections.adminNote")}</p>
                <p className="mt-1 text-sm text-red-950">{record.adminNote}</p>
              </div>
            ) : null}

            {record.reviewedAt ? (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
                Reviewed {formatDate(record.reviewedAt)}
                {formatReviewedByLabel(record.reviewedByName, record.reviewedByCode)
                  ? ` by ${formatReviewedByLabel(record.reviewedByName, record.reviewedByCode)}`
                  : ""}
              </p>
            ) : null}
          </div>

          {record.status === "PENDING" ? (
            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
              <AdminActionCodeField
                id="enrollment-admin-code"
                value={adminActionCode}
                onChange={setAdminActionCode}
                className="max-w-sm"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 sm:order-1"
                  onClick={() => {
                    setRejectNote("");
                    setRejectOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button type="button" disabled={busy} onClick={() => void approve()} className="sm:order-2">
                  {busy ? t("admin.shared.approving") : t("admin.enrollmentApplications.detail.approveEnrollment")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.enrollmentApplications.detail.rejectDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <AdminActionCodeField
              id="reject-admin-code"
              value={adminActionCode}
              onChange={setAdminActionCode}
            />
            <div className="space-y-2">
              <Label htmlFor="reject-note-detail">{t("admin.enrollmentApplications.detail.rejectDialog.noteLabel")}</Label>
              <Textarea
                id="reject-note-detail"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t("admin.enrollmentApplications.detail.rejectDialog.notePlaceholder")}
                className="min-h-[88px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmReject()}>
              {busy ? t("admin.shared.rejecting") : "Reject application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
);
}
