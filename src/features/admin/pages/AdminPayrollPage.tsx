import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { buildPayrollProofPagePath } from "@/features/admin/data/adminPayrollProofStore";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import type { AdminPaymentRow, PaymentStatus } from "@/features/admin/data/adminOperationalMock";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import {
  aggregatePaymentsByClass,
  currencyMapToFormattedLines,
  estimateInstructorPayoutLines,
  formatMoney,
  INSTRUCTOR_REVENUE_SHARE,
  sumAmountsForStatuses,
} from "@/features/payroll/classPayrollAggregate";
import {
  instructorPayrollRequestStore,
  useInstructorPayrollRequests,
} from "@/features/teacher/data/instructorPayrollRequestStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function CurrencyAmountLines({
  lines,
  emptyLabel,
}: {
  lines: { currency: string; formatted: string }[];
  emptyLabel: string;
}) {
  if (lines.length === 0) {
    return <p className="text-lg font-semibold text-slate-400 tabular-nums">{emptyLabel}</p>;
  }
  return (
    <>
      {lines.map((line) => (
        <p key={line.currency} className="text-2xl font-semibold text-slate-900 tabular-nums">
          {line.formatted}
        </p>
      ))}
    </>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export default function AdminPayrollPage() {
  const payments = useAdminPayments();
  const payrollRequests = useInstructorPayrollRequests();
  const pendingPayrollRequests = useMemo(
    () => payrollRequests.filter((r) => r.status === "pending"),
    [payrollRequests],
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const classOptions = useMemo(() => {
    const names = new Set(payments.map((p) => p.className));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (classFilter !== "all" && p.className !== classFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        p.studentName,
        p.studentEmail,
        p.className,
        p.course,
        p.lecturerName,
        p.lecturerEmail,
        p.reference,
        p.status,
        formatMoney(p.amount, p.currency),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [payments, search, classFilter, statusFilter]);

  const collectedInView = useMemo(
    () => sumAmountsForStatuses(filteredPayments, ["paid"]),
    [filteredPayments],
  );
  const outstandingInView = useMemo(
    () => sumAmountsForStatuses(filteredPayments, ["pending", "overdue"]),
    [filteredPayments],
  );

  const paidRowCount = useMemo(
    () => filteredPayments.filter((p) => p.status === "paid").length,
    [filteredPayments],
  );
  const unpaidRowCount = useMemo(
    () => filteredPayments.filter((p) => p.status === "pending" || p.status === "overdue").length,
    [filteredPayments],
  );

  const totalsByClass = useMemo(() => aggregatePaymentsByClass(filteredPayments), [filteredPayments]);

  const hasActiveFilters = search.trim() !== "" || classFilter !== "all" || statusFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link
          to="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Payroll"
          description="Tuition by class — synced with Payments. Payout proofs are uploaded on a dedicated page per class."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/payroll/submissions">Submission log</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/payments">Payments & reminders</Link>
              </Button>
            </div>
          }
        />

        {pendingPayrollRequests.length > 0 ? (
          <Card className="mb-8 rounded-xl border-amber-200/90 bg-amber-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">Instructor payroll requests</CardTitle>
              <p className="text-sm text-slate-600 font-normal">
                Instructors submitted figures from their Payroll page. Approve to acknowledge, or reject with a short note.
                You can still upload payout proof from each class card below.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingPayrollRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-amber-200/80 bg-white p-4 shadow-sm space-y-3"
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
                        Submitted {new Date(r.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          const ok = instructorPayrollRequestStore.approve(r.id);
                          if (ok) toast.success("Request approved", { description: r.instructorName });
                          else toast.error("Could not approve", { description: "Request may have been removed." });
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const note = rejectNotes[r.id]?.trim();
                          const ok = instructorPayrollRequestStore.reject(r.id, note);
                          if (ok) {
                            toast.message("Request rejected", { description: r.instructorName });
                            setRejectNotes((prev) => {
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                          } else toast.error("Could not reject");
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{r.summary}</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {r.periodLabel ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Period</dt>
                        <dd className="text-slate-800">{r.periodLabel}</dd>
                      </div>
                    ) : null}
                    {r.sessionsTaught ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Sessions taught</dt>
                        <dd className="text-slate-800">{r.sessionsTaught}</dd>
                      </div>
                    ) : null}
                    {r.requestedPayout ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Requested payout</dt>
                        <dd className="text-slate-800 tabular-nums">{r.requestedPayout}</dd>
                      </div>
                    ) : null}
                    {r.payoutDetails ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Payout details</dt>
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
                      placeholder="Reason or next steps…"
                      className="mt-1 bg-white min-h-[72px]"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-8">
          <Input
            placeholder="Search student, class, course, lecturer, invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => {
                setSearch("");
                setClassFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-6 max-w-4xl">
          <Card className="rounded-lg border border-slate-200 shadow-sm sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Totals in current view</CardTitle>
              <p className="text-xs text-slate-500 font-normal mt-1">
                Collected counts paid tuition; outstanding is pending and overdue rows that match your filters.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredPayments.length === 0 ? (
                <p className="text-lg font-medium text-slate-500">No payments in this view.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">Collected</p>
                    <CurrencyAmountLines lines={collectedInView} emptyLabel="—" />
                    <p className="text-xs text-emerald-800/90 mt-2 tabular-nums">{paidRowCount} paid row(s)</p>
                  </div>
                  <div className="rounded-md border border-amber-200/80 bg-amber-50/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 mb-1">Outstanding</p>
                    <CurrencyAmountLines lines={outstandingInView} emptyLabel="—" />
                    <p className="text-xs text-amber-900/90 mt-2 tabular-nums">{unpaidRowCount} unpaid row(s)</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                {filteredPayments.length} payment row(s) total · {totalsByClass.length} class section(s) with activity
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Payroll by class</h2>
              <p className="text-sm text-slate-500 mt-1">
                Tuition and demo payout share per section ({Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% of collected).
              </p>
            </div>
          </div>

          {totalsByClass.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
              No enrollment payments match your filters. Try clearing filters or recording payments first.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {totalsByClass.map((row) => {
                const paidLines = currencyMapToFormattedLines(row.paidByCurrency);
                const outLines = currencyMapToFormattedLines(row.outstandingByCurrency);
                const payoutLines = estimateInstructorPayoutLines(row.paidByCurrency);
                const focused = classFilter === row.className && classFilter !== "all";
                return (
                  <article
                    key={`${row.className}-${row.course}`}
                    className={`flex flex-col rounded-xl border bg-white p-5 transition-colors ${
                      focused ? "border-slate-900" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <header className="space-y-1">
                      <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-slate-900">
                        {row.className}
                      </h3>
                      <p className="text-sm text-slate-500">{row.course}</p>
                    </header>

                    <div className="mt-5 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                        aria-hidden
                      >
                        {initialsFromName(row.lecturerName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{row.lecturerName}</p>
                        <p className="text-xs text-slate-500">
                          {row.paymentCount} invoice{row.paymentCount === 1 ? "" : "s"} · {row.paidCount} paid ·{" "}
                          {row.unpaidCount} unpaid
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-sm text-slate-500">Collected</dt>
                        <dd className="text-right">
                          {paidLines.length === 0 ? (
                            <span className="text-sm tabular-nums text-slate-400">—</span>
                          ) : (
                            paidLines.map((line) => (
                              <p key={line.currency} className="text-sm font-semibold tabular-nums text-slate-900">
                                {line.formatted}
                              </p>
                            ))
                          )}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-sm text-slate-500">Outstanding</dt>
                        <dd className="text-right">
                          {outLines.length === 0 ? (
                            <span className="text-sm tabular-nums text-slate-400">—</span>
                          ) : (
                            outLines.map((line) => (
                              <p key={line.currency} className="text-sm font-semibold tabular-nums text-slate-900">
                                {line.formatted}
                              </p>
                            ))
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Est. payout</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Demo · {Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% of collected
                          </p>
                        </div>
                        <div className="text-right">
                          {payoutLines.length === 0 ? (
                            <span className="text-sm text-slate-400">—</span>
                          ) : (
                            payoutLines.map((line) => (
                              <p key={line.currency} className="text-base font-semibold tabular-nums text-slate-900">
                                {line.formatted}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-4 w-full font-normal"
                      asChild
                    >
                      <Link
                        to={buildPayrollProofPagePath(
                          row.className,
                          row.course,
                          row.lecturerName,
                          row.lecturerEmail,
                        )}
                      >
                        Upload payout proof
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full justify-between gap-2 font-normal text-slate-700"
                      disabled={focused}
                      onClick={() => {
                        setClassFilter(row.className);
                        requestAnimationFrame(() => {
                          document.getElementById("admin-payroll-student-payments")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        });
                      }}
                    >
                      <span>{focused ? "Shown below" : "View payments"}</span>
                      {!focused ? <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden /> : null}
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <h2
          id="admin-payroll-student-payments"
          className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 scroll-mt-28"
        >
          Student payments
        </h2>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    No payments match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p: AdminPaymentRow) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-900">
                      <div className="min-w-0">
                        <p className="truncate">{p.studentName}</p>
                        <p className="text-xs text-slate-500 truncate">{p.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-800">{p.className}</TableCell>
                    <TableCell className="text-slate-700">{p.course}</TableCell>
                    <TableCell className="text-slate-700">{p.lecturerName}</TableCell>
                    <TableCell className="tabular-nums">{formatMoney(p.amount, p.currency)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">{p.dueDate}</TableCell>
                    <TableCell className="tabular-nums text-slate-700">{p.paidAt ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
