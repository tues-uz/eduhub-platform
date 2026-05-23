import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronDown } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { PayrollInstructorProofPanel } from "@/features/admin/components/PayrollInstructorProofPanel";
import { buildPayrollProofPagePath } from "@/features/admin/data/adminPayrollProofStore";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import {
  instructorPayrollRequestStore,
  useInstructorPayrollRequests,
} from "@/features/teacher/data/instructorPayrollRequestStore";
import {
  aggregatePaymentsByClass,
  buildPayrollSummaryText,
} from "@/features/payroll/classPayrollAggregate";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import { cn, formatThousandsInText } from "@/lib/utils";

function StatusLine({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return <span className="text-sm font-medium text-emerald-700">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="text-sm font-medium text-red-700">Not approved</span>;
  }
  return <span className="text-sm font-medium text-amber-800">Awaiting your decision</span>;
}

export default function AdminInstructorPayrollRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const payments = useAdminPayments();
  const payrollRequests = useInstructorPayrollRequests();
  const record = useMemo(
    () => payrollRequests.find((r) => r.id === requestId),
    [payrollRequests, requestId],
  );

  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDialogNote, setRejectDialogNote] = useState("");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();

  const payrollSummary = useMemo(() => {
    if (!record) return "";
    const rows = payments.filter((p) => p.className === record.classSection && p.course === record.course);
    const aggs = aggregatePaymentsByClass(rows);
    const agg = aggs[0];
    if (!agg || agg.paymentCount === 0) {
      return "No tuition rows for this class in the current payment list.";
    }
    return buildPayrollSummaryText(agg);
  }, [payments, record]);

  const proofHref = useMemo(() => {
    if (!record) return "";
    return buildPayrollProofPagePath(
      record.classSection,
      record.course,
      record.instructorName,
      record.instructorEmailNorm,
    );
  }, [record]);

  if (!requestId) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6 max-w-3xl py-8">
          <p className="text-sm text-slate-600">Missing submission id.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard/admin/payroll">Back to payroll</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  if (!record) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6 max-w-3xl py-8">
          <p className="text-sm font-medium text-slate-900">Submission not found</p>
          <p className="text-sm text-slate-600 mt-1">It may have been removed or the link is invalid.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/dashboard/admin/payroll">Back to payroll</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const requestedDisplay = record.requestedPayout ? formatThousandsInText(record.requestedPayout) : "—";

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-2xl px-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to="/dashboard/admin/payroll"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Payroll
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/admin/payroll/instructor-requests">Pending queue</Link>
          </Button>
        </div>

        {/* At-a-glance */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-6 shadow-sm mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Class</p>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight mt-0.5">{record.classSection}</h1>
              <p className="text-sm text-slate-600 mt-1">{record.course}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-0.5">
                <StatusLine status={record.status} />
              </div>
            </div>
          </div>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <p className="text-xs font-medium text-slate-500">Instructor</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{record.instructorName}</p>
              {record.instructorEmailNorm ? (
                <p className="text-xs text-slate-500 truncate mt-0.5" title={record.instructorEmailNorm}>
                  {record.instructorEmailNorm}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Request amount</p>
              <p className="text-xl font-semibold tabular-nums text-slate-900 mt-1">{requestedDisplay}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Submitted</p>
              <p className="text-sm text-slate-800 mt-1 tabular-nums">
                {new Date(record.submittedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {record.periodLabel ? (
                <p className="text-xs text-slate-500 mt-1">Period: {record.periodLabel}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Optional deep read */}
        <Collapsible open={submissionOpen} onOpenChange={setSubmissionOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50",
                submissionOpen && "rounded-b-none border-b-0",
              )}
            >
              <span>{submissionOpen ? "Hide" : "Show"} full submission from instructor</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", submissionOpen && "rotate-180")}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 pb-4 pt-0 shadow-sm space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed pt-2">{formatThousandsInText(record.summary)}</p>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {record.sessionsTaught ? (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Sessions taught</dt>
                    <dd className="mt-0.5 text-slate-900">{record.sessionsTaught}</dd>
                  </div>
                ) : null}
                {record.payoutDetails ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500">Payout details</dt>
                    <dd className="mt-0.5 text-slate-800">{formatThousandsInText(record.payoutDetails)}</dd>
                  </div>
                ) : null}
              </dl>
              {record.instructorNotes ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-medium text-slate-500">Instructor notes</p>
                  <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{record.instructorNotes}</p>
                </div>
              ) : null}
              {record.status === "rejected" && record.adminNote ? (
                <div className="rounded-lg border border-red-200/80 bg-red-50/60 p-3">
                  <p className="text-xs font-medium text-red-900">Note sent to instructor</p>
                  <p className="text-sm text-red-950 mt-1 whitespace-pre-wrap">{record.adminNote}</p>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {record.status === "approved" ? (
          <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
            Figures are approved
            {record.reviewedByCode ? (
              <>
                {" "}
                by <span className="font-mono font-medium">{record.reviewedByCode}</span>
              </>
            ) : null}
            {record.resolvedAt
              ? ` (${new Date(record.resolvedAt).toLocaleDateString(undefined, { dateStyle: "medium" })})`
              : ""}
            . Use the transfer proof section below to attach or update the bank receipt — that notifies the
            instructor in this demo.
          </div>
        ) : null}
        {record.status === "rejected" ? (
          <div className="mb-4 rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3 text-sm text-red-950">
            This request was declined
            {record.resolvedAt
              ? ` (${new Date(record.resolvedAt).toLocaleDateString(undefined, { dateStyle: "medium" })})`
              : ""}
            {record.reviewedByCode ? ` · ${record.reviewedByCode}` : ""}
            . You can still use the proof section below if you need a receipt on file.
          </div>
        ) : null}
        {record.status === "pending" ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Suggested order:</span> attach and submit bank transfer proof in the section
            below first, then scroll down to approve or decline the instructor&apos;s figures.
          </div>
        ) : null}

        {/* Proof — admin completes this before final decision */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden mb-6">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
            <CardTitle className="text-lg">Transfer proof</CardTitle>
            <CardDescription>
              Upload the bank receipt and submit here. When you&apos;re done, scroll down to approve or decline the
              payroll request (pending requests only).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-6">
            <p className="text-xs leading-relaxed text-slate-600 mb-5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <span className="font-medium text-slate-700">Tuition snapshot (for their notification): </span>
              {payrollSummary}
            </p>
            <PayrollInstructorProofPanel
              className={record.classSection}
              course={record.course}
              embedded={false}
              instructorName={record.instructorName}
              instructorEmail={record.instructorEmailNorm}
              payrollSummary={payrollSummary}
            />
            <p className="mt-6 text-center text-xs text-slate-500">
              <Link to={proofHref} className="underline underline-offset-2 hover:text-slate-800">
                Open the same proof tools on a dedicated page
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Decision — after proof (pending only) */}
        {record.status === "pending" ? (
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Approve or decline</CardTitle>
              <CardDescription>
                After transfer proof is on file (recommended), confirm whether you accept this instructor&apos;s payroll
                figures. Decline opens a confirmation step so you don&apos;t mis-click.{" "}
                <span className="text-slate-700">
                  Approve or decline sends an in-app notification to the instructor (Teacher → Notifications):{" "}
                  <span className="font-medium">Payroll request approved</span> or{" "}
                  <span className="font-medium">Payroll request not approved</span>, with your note when you decline.
                  Demo uses this browser only; skipped if there is no instructor email and no name on the submission.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AdminActionCodeField
                id="payroll-detail-admin-code"
                value={adminActionCode}
                onChange={setAdminActionCode}
              />
              <Button
                type="button"
                size="lg"
                className="w-full bg-emerald-600 text-base font-medium hover:bg-emerald-700"
                onClick={() => {
                  let code: string;
                  try {
                    code = validateAdminActionCodeOrThrow(adminActionCode);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enter your admin code");
                    return;
                  }
                  const ok = instructorPayrollRequestStore.approve(record.id, code);
                  if (ok) toast.success("Approved", { description: `${record.instructorName} was notified.` });
                  else toast.error("Could not approve");
                }}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden />
                Approve this request
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setRejectOpen(true)}>
                Decline and notify instructor…
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this payroll request?</AlertDialogTitle>
              <AlertDialogDescription>
                The instructor will see this in their notifications. You can leave a short explanation (recommended).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <AdminActionCodeField
                id="payroll-reject-admin-code"
                value={adminActionCode}
                onChange={setAdminActionCode}
              />
              <div className="space-y-2">
                <Label htmlFor="reject-dialog-note">Note to instructor</Label>
                <Textarea
                  id="reject-dialog-note"
                  value={rejectDialogNote}
                  onChange={(e) => setRejectDialogNote(e.target.value)}
                  placeholder="Reason they should fix or resubmit…"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => setRejectDialogNote("")}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  let code: string;
                  try {
                    code = validateAdminActionCodeOrThrow(adminActionCode);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enter your admin code");
                    return;
                  }
                  const ok = instructorPayrollRequestStore.reject(record.id, code, rejectDialogNote.trim());
                  if (ok) {
                    toast.message("Request declined", { description: record.instructorName });
                    setRejectDialogNote("");
                    setRejectOpen(false);
                  } else toast.error("Could not decline");
                }}
              >
                Decline request
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
