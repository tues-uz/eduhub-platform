import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronDown, Loader2 } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { PayrollInstructorProofPanel } from "@/features/admin/components/PayrollInstructorProofPanel";
import { usePayrollRequestSchedule } from "@/features/admin/hooks/usePayrollRequestSchedule";
import { buildPayrollProofPagePath } from "@/features/admin/data/adminPayrollProofStore";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import { ClassSchedulePreviewPanel } from "@/features/courses/ClassSchedulePreviewPanel";
import {
  formatClassDateLabel,
  formatSessionTimeLabel,
  resolveEnrollmentSessionTimingStatus,
  yearMonthKey,
} from "@/features/courses/classSchedulePreview";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
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
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDialogNote, setRejectDialogNote] = useState("");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();
  const [viewingScheduleMonth, setViewingScheduleMonth] = useState<1 | 2 | 3>(1);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    instructorPayrollRequestStore.load().finally(() => {
      if (!cancelled) setRequestsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const payrollSchedule = usePayrollRequestSchedule({
    classSection: record?.classSection ?? "",
    course: record?.course ?? "",
    periodLabel: record?.periodLabel ?? "",
    submittedAt: record?.submittedAt ?? "",
  });

  useEffect(() => {
    setViewingScheduleMonth(payrollSchedule.monthCompletion.viewingMonth);
  }, [payrollSchedule.monthCompletion.viewingMonth, record?.id]);

  const scheduleAttendance = useScheduleAttendanceState(payrollSchedule.courseId);

  const periodScheduleSessions = useMemo(() => {
    const ym = payrollSchedule.monthCompletion.periodYearMonth;
    if (!ym) return [];
    return payrollSchedule.slots.filter((slot) => yearMonthKey(slot.sessionDate) === ym);
  }, [payrollSchedule.slots, payrollSchedule.monthCompletion.periodYearMonth]);

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
            <Link to="/dashboard/admin/payroll?tab=requests">Back to payroll</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  if (!record && requestsLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6 max-w-3xl py-8">
          <p className="text-sm text-slate-600">Loading payroll submission…</p>
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
            <Link to="/dashboard/admin/payroll?tab=requests">Back to payroll</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const requestedDisplay = record.requestedPayout ? formatThousandsInText(record.requestedPayout) : "—";

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-3xl px-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to="/dashboard/admin/payroll?tab=requests"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Instructor requests
          </Link>
          {record.status === "pending" ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/admin/payroll?tab=requests">All requests</Link>
            </Button>
          ) : null}
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

        {/* Class schedule — payroll eligibility is all sessions finished in the request month */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden mb-6">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
            <CardTitle className="text-lg">Class schedule</CardTitle>
            <CardDescription>
              Admin-proposed schedule, approved by the instructor. Payroll for{" "}
              {record.periodLabel ? (
                <span className="font-medium text-slate-800">{record.periodLabel}</span>
              ) : (
                "the requested period"
              )}{" "}
              is eligible only when every session in that calendar month is marked finished (attendance held).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-5">
            {payrollSchedule.loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 py-4">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Loading class schedule…
              </div>
            ) : !payrollSchedule.courseId ? (
              <p className="text-sm leading-relaxed text-slate-600">
                Could not match this class to a course schedule. Check that the class section and course title align
                with an admin course or teacher course in the demo.
              </p>
            ) : (
              <>
                {payrollSchedule.usingDemoSchedule ? (
                  <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                    Showing the demo schedule for this class so you can verify sessions before approving payroll. When
                    the API returns live course data, this panel updates automatically.
                  </p>
                ) : null}
                {payrollSchedule.monthCompletion.periodLabel ? (
                  <div
                    className={cn(
                      "mb-4 rounded-xl border px-4 py-3 text-sm",
                      payrollSchedule.monthCompletion.eligible
                        ? "border-emerald-200/90 bg-emerald-50/60 text-emerald-950"
                        : payrollSchedule.monthCompletion.totalInPeriod > 0
                          ? "border-amber-200/80 bg-amber-50/60 text-amber-950"
                          : "border-slate-200 bg-slate-50/80 text-slate-700",
                    )}
                  >
                    <p className="font-medium">
                      {payrollSchedule.monthCompletion.periodLabel}
                      {payrollSchedule.monthCompletion.totalInPeriod > 0 ? (
                        <>
                          {": "}
                          <span className="tabular-nums">
                            {payrollSchedule.monthCompletion.finishedInPeriod}/
                            {payrollSchedule.monthCompletion.totalInPeriod}
                          </span>{" "}
                          sessions finished
                        </>
                      ) : (
                        ": no sessions in this month"
                      )}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      {payrollSchedule.monthCompletion.eligible
                        ? "All sessions in this month are finished — eligible for payroll for this period."
                        : payrollSchedule.monthCompletion.totalInPeriod > 0
                          ? "Payroll should be processed after the remaining sessions in this month are finished."
                          : "Confirm the period label matches a month that has scheduled sessions."}
                    </p>
                  </div>
                ) : null}
                {periodScheduleSessions.length > 0 ? (
                  <div className="mb-4 rounded-xl border border-[#3954d0]/20 bg-[#3954d0]/[0.04] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#3954d0]/90">
                      Sessions in {payrollSchedule.monthCompletion.periodLabel ?? record.periodLabel}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {periodScheduleSessions.map((slot, idx) => {
                        const timingStatus = resolveEnrollmentSessionTimingStatus(
                          slot,
                          scheduleAttendance.heldSlotKeys,
                          scheduleAttendance.activeSlotKeys,
                        );
                        const dateLabel = formatClassDateLabel(slot.sessionDate) ?? "Date TBA";
                        const timeLabel = formatSessionTimeLabel(slot.sessionTime);
                        return (
                          <li
                            key={`${slot.sessionDate}-${slot.sessionTime}-${idx}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/80 bg-white px-3 py-2 text-sm shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {slot.title?.trim() || `Meeting ${idx + 1}`}
                              </p>
                              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                                {dateLabel}
                                {timeLabel ? ` · ${timeLabel}` : ""}
                              </p>
                            </div>
                            <SessionTimingChip status={timingStatus} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <ClassSchedulePreviewPanel
                  courseId={payrollSchedule.courseId}
                  apiCourse={payrollSchedule.apiCourse}
                  scheduleProposal={payrollSchedule.scheduleProposal}
                  teacherCourse={payrollSchedule.teacherCourse}
                  viewingMonth={viewingScheduleMonth}
                  onViewingMonthChange={setViewingScheduleMonth}
                  heldSlotKeys={scheduleAttendance.heldSlotKeys}
                  activeSlotKeys={scheduleAttendance.activeSlotKeys}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
                />
              </>
            )}
          </CardContent>
        </Card>

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
              requestId={record.id}
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
              <Button
                type="button"
                size="lg"
                className="w-full bg-emerald-600 text-base font-medium hover:bg-emerald-700"
                onClick={() => setApproveOpen(true)}
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

        <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Approve this payroll request?</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm you accept {record.instructorName}&apos;s figures for {record.classSection}. The instructor
                will be notified in Teacher → Notifications.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <AdminActionCodeField
                id="payroll-approve-admin-code"
                value={adminActionCode}
                onChange={setAdminActionCode}
              />
            </div>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  let code: string;
                  try {
                    code = validateAdminActionCodeOrThrow(adminActionCode);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enter your admin code");
                    return;
                  }
                  const ok = await instructorPayrollRequestStore.approve(record.id, code);
                  if (ok) {
                    toast.success("Approved", { description: `${record.instructorName} was notified.` });
                    setApproveOpen(false);
                  } else toast.error("Could not approve");
                }}
              >
                Approve request
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={rejectOpen}
          onOpenChange={(open) => {
            setRejectOpen(open);
            if (!open) setRejectDialogNote("");
          }}
        >
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
                onClick={async () => {
                  let code: string;
                  try {
                    code = validateAdminActionCodeOrThrow(adminActionCode);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enter your admin code");
                    return;
                  }
                  const ok = await instructorPayrollRequestStore.reject(record.id, code, rejectDialogNote.trim());
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
