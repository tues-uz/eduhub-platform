import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { eduhubAdminEnrollmentApplications, eduhubCourses } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  expectedPayNowForRecord,
  inferTuitionPlanMonths,
  payNowMatchesDeclared,
  tuitionPlanTitle,
  tuitionThirds,
} from "@/features/enrollment/enrollmentTuitionThirds";

function formatMoney(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function installmentLabel(count: number | undefined): string {
  if (count == null) return "—";
  return String(count);
}

function shortPaymentSummary(r: EnrollmentApplicationResponse): string {
  const plan = inferTuitionPlanMonths(r);
  const cur = r.priceCurrency ?? "USD";
  if (plan === 3) return "Full (3 mo)";
  if (plan === 1 || plan === 2) {
    return `${tuitionPlanTitle(plan)} · ${formatMoney(r.downPaymentAmount, cur)}`;
  }
  return `${r.paymentPlan} · ${installmentLabel(r.installmentCount)} inst.`;
}

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
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EnrollmentApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [listedTuition, setListedTuition] = useState<number | null>(null);
  const [listedCurrency, setListedCurrency] = useState("USD");
  const [coursePriceLoading, setCoursePriceLoading] = useState(false);

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
        toast.error("Failed to load application");
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  useEffect(() => {
    if (!record?.courseId || !isUuid(record.courseId)) {
      setListedTuition(null);
      setCoursePriceLoading(false);
      return;
    }
    setCoursePriceLoading(true);
    eduhubCourses
      .getById(record.courseId)
      .then((c) => {
        const amt = c.pricing?.discountedAmount ?? c.pricing?.amount;
        const cur = c.pricing?.currency ?? "USD";
        setListedCurrency(cur);
        setListedTuition(amt != null && amt > 0 ? amt : null);
      })
      .catch(() => setListedTuition(null))
      .finally(() => setCoursePriceLoading(false));
  }, [record?.courseId]);

  const approve = async () => {
    if (!record || record.status !== "PENDING") return;
    setBusy(true);
    try {
      await eduhubAdminEnrollmentApplications.approve(record.id);
      toast.success("Approved", {
        description: "Student enrolled successfully. They can now access this class.",
      });
      navigate("/dashboard/admin/enrollment-applications");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Could not approve application", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!record) return;
    setBusy(true);
    try {
      await eduhubAdminEnrollmentApplications.reject(record.id, {
        adminNote: rejectNote.trim() || undefined,
      });
      toast.message("Application rejected", {
        description: "The student can submit again if needed.",
      });
      setRejectOpen(false);
      navigate("/dashboard/admin/enrollment-applications");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Could not reject application", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading application...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!applicationId) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6 py-8">
          <p className="text-slate-600">Missing application.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard/admin/enrollment-applications">Back to list</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  if (!record) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-2xl px-6 py-8">
          <Link
            to="/dashboard/admin/enrollment-applications"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to enrollment applications
          </Link>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Application not found</h1>
            <p className="mt-2 text-sm text-slate-600">
              It may have been removed or the link is invalid.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard/admin/enrollment-applications">Return to list</Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-3xl px-6 pb-16 pt-2">
        <Link
          to="/dashboard/admin/enrollment-applications"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to enrollment applications
        </Link>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Enrollment application</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Review submission</h1>
          <p className="mt-2 text-sm text-slate-600">
            Verify contact details, payment choice, and open proof / ID before approving or rejecting.
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Class</p>
              <p className="mt-1 font-medium text-slate-900">{record.courseTitle ?? record.courseId}</p>
              <p className="mt-1 text-xs text-slate-500 break-all font-mono">{record.courseId}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student</p>
              <p className="mt-1 font-medium text-slate-900">{record.fullName}</p>
              <p className="text-slate-600 break-all">{record.email}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact</p>
              <p className="mt-1">{record.phone}</p>
              {record.phoneSecondary ? <p className="text-slate-600">{record.phoneSecondary}</p> : null}
              <p className="mt-2 text-slate-700 whitespace-pre-wrap">{record.address}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment schedule</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {tuitionPlanTitle(inferTuitionPlanMonths(record))}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Raw fields: {record.paymentPlan}
                {record.installmentCount != null ? ` · ${record.installmentCount} further instalment(s)` : ""}
                {record.downPaymentAmount != null
                  ? ` · Declared first payment: ${formatMoney(record.downPaymentAmount, record.priceCurrency ?? "USD")}`
                  : record.paymentPlan === "FULL"
                    ? " · No separate down payment (full plan)"
                    : ""}
              </p>

              {coursePriceLoading ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading listed course price to verify thirds…
                </p>
              ) : listedTuition != null && listedTuition > 0 ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <p className="text-slate-600">
                    Listed tuition (course today):{" "}
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatMoney(listedTuition, listedCurrency)}
                    </span>
                  </p>
                  {(() => {
                    const thirds = tuitionThirds(listedTuition);
                    if (!thirds) return null;
                    const [a, b, c] = thirds;
                    const expected = expectedPayNowForRecord(record, listedTuition);
                    const match = payNowMatchesDeclared(record, listedTuition);
                    return (
                      <>
                        <p className="text-slate-700">
                          Three equal parts:{" "}
                          <span className="font-medium tabular-nums text-slate-900">
                            {formatMoney(a, listedCurrency)} + {formatMoney(b, listedCurrency)} +{" "}
                            {formatMoney(c, listedCurrency)}
                          </span>
                        </p>
                        {expected != null ? (
                          <p className="text-slate-700">
                            Expected pay with application:{" "}
                            <span className="font-semibold tabular-nums text-slate-900">
                              {formatMoney(expected, listedCurrency)}
                            </span>
                          </p>
                        ) : null}
                        {match === false ? (
                          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-950">
                            Declared first payment does not match the listed tuition split for this plan — double-check
                            the proof amount and course price.
                          </p>
                        ) : match === true ? (
                          <p className="text-xs font-medium text-emerald-800">Declared amount matches this split.</p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Could not verify amount (plan type or price unavailable).
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Listed tuition not loaded (non-UUID course id or no price on course). Use payment proof and declared
                  fields above; student chose: <span className="font-medium">{shortPaymentSummary(record)}</span>.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-8 border-t border-slate-100 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Payment proof
                </p>
                <a
                  href={record.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Open proof in new tab
                </a>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  ID document
                </p>
                {record.idCardUrl ? (
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

            {record.adminNote ? (
              <div className="rounded-lg border border-red-100 bg-red-50/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800">Admin note</p>
                <p className="mt-1 text-sm text-red-950">{record.adminNote}</p>
              </div>
            ) : null}

            {record.reviewedAt ? (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
                Reviewed {formatDate(record.reviewedAt)}
                {record.reviewedByName ? ` by ${record.reviewedByName}` : ""}
              </p>
            ) : null}
          </div>

          {record.status === "PENDING" ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:justify-end">
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
                {busy ? "Approving…" : "Approve enrollment"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note-detail">Note to student (optional)</Label>
            <Textarea
              id="reject-note-detail"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Amount mismatch, illegible screenshot"
              className="min-h-[88px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmReject()}>
              {busy ? "Rejecting…" : "Reject application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
