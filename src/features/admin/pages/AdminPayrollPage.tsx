import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import type { AdminPaymentRow } from "@/features/admin/data/adminOperationalMock";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import { aggregatePaymentsByClass, formatMoney, sumAmountsForStatuses } from "@/features/payroll/classPayrollAggregate";
import { formatThousandsInText } from "@/lib/utils";
import { useInstructorPayrollRequests } from "@/features/teacher/data/instructorPayrollRequestStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PayrollTab = "requests" | "tuition" | "proof";

function parsePayrollTab(value: string | null): PayrollTab {
  if (value === "tuition" || value === "proof") return value;
  return "requests";
}

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

function formatSubmittedShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function RequestStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900">
        Not approved
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
      Pending review
    </span>
  );
}

export default function AdminPayrollPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parsePayrollTab(searchParams.get("tab"));

  const payments = useAdminPayments();
  const payrollRequests = useInstructorPayrollRequests();
  const proofRows = useMemo(
    () =>
      payrollRequests
        .filter((r) => r.status === "approved")
        .map((r) => ({
          id: r.id,
          submittedAt: r.resolvedAt ?? r.submittedAt,
          classSection: r.classSection,
          course: r.course,
          instructorName: r.instructorName,
          instructorEmail: r.instructorEmailNorm || undefined,
          summary: r.summary,
          notesPreview: r.adminNote,
        })),
    [payrollRequests],
  );

  const pendingPayrollCount = useMemo(
    () => payrollRequests.filter((r) => r.status === "pending").length,
    [payrollRequests],
  );
  const approvedPayrollCount = useMemo(
    () => payrollRequests.filter((r) => r.status === "approved").length,
    [payrollRequests],
  );

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [proofSearch, setProofSearch] = useState("");

  const setActiveTab = (tab: PayrollTab) => {
    setSearchParams(tab === "requests" ? {} : { tab }, { replace: true });
  };

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

  const instructorRequestsSorted = useMemo(
    () => [...payrollRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [payrollRequests],
  );

  const instructorRequestsFiltered = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return instructorRequestsSorted.filter((r) => {
      if (requestStatusFilter !== "all" && r.status !== requestStatusFilter) return false;
      if (!q) return true;
      const hay = [
        r.instructorName,
        r.instructorEmailNorm,
        r.classSection,
        r.course,
        r.periodLabel,
        r.sessionsTaught,
        r.requestedPayout,
        r.payoutDetails,
        r.summary,
        r.instructorNotes,
        r.adminNote ?? "",
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [instructorRequestsSorted, requestStatusFilter, requestSearch]);

  const proofRowsFiltered = useMemo(() => {
    const q = proofSearch.trim().toLowerCase();
    if (!q) return proofRows;
    return proofRows.filter((r) =>
      [r.classSection, r.course, r.instructorName, r.instructorEmail ?? "", r.summary, r.notesPreview ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [proofRows, proofSearch]);

  const hasActiveTuitionFilters = search.trim() !== "" || classFilter !== "all" || statusFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-7xl">
        <Link
          to="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Payroll"
          description="Review instructor payroll submissions, then record bank transfer proof. Student tuition is available separately for reference when checking figures."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/admin/payments">Payments & reminders</Link>
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(parsePayrollTab(value))} className="w-full">
          <TabsList className="mb-6 h-11 w-full sm:w-auto justify-start bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <TabsTrigger value="requests" className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm">
              Instructor requests
              {pendingPayrollCount > 0 ? (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-950">
                  {pendingPayrollCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="tuition" className="rounded-lg px-4 data-[state=active]:shadow-sm">
              Student tuition
            </TabsTrigger>
            <TabsTrigger value="proof" className="rounded-lg px-4 data-[state=active]:shadow-sm">
              Payout proof
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">How payroll works</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-slate-600">
                <li>Open a submission and verify class figures against the schedule month.</li>
                <li>Approve or reject the instructor&apos;s requested payout.</li>
                <li>After you pay them, record transfer proof on the detail page or Payout proof tab.</li>
              </ol>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Pending review</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-amber-900">{pendingPayrollCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-emerald-800">{approvedPayrollCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">All submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{payrollRequests.length}</p>
                </CardContent>
              </Card>
            </div>

            {pendingPayrollCount > 0 ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <span className="font-semibold">{pendingPayrollCount} submission{pendingPayrollCount === 1 ? "" : "s"}</span>{" "}
                waiting for your decision. Filter by <span className="font-medium">Pending review</span> or open any row
                to review.
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4">
              <Input
                placeholder="Search instructor, class, period, amount…"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="max-w-md bg-white"
              />
              <Select
                value={requestStatusFilter}
                onValueChange={(v) => setRequestStatusFilter(v as typeof requestStatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Not approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {instructorRequestsSorted.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
                No instructor payroll submissions yet. They appear when a teacher submits from their Payroll page.
              </div>
            ) : instructorRequestsFiltered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
                No rows match your search or status filter.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="whitespace-nowrap">Schedule month</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Requested</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructorRequestsFiltered.map((r) => (
                      <TableRow key={r.id} className={r.status === "pending" ? "bg-amber-50/40" : undefined}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-600 tabular-nums">
                          {formatSubmittedShort(r.submittedAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 whitespace-nowrap">
                          {r.instructorName}
                        </TableCell>
                        <TableCell
                          className="text-sm text-slate-800 max-w-[200px] truncate"
                          title={`${r.classSection} · ${r.course}`}
                        >
                          {r.classSection}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.periodLabel || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-700 tabular-nums whitespace-nowrap text-right">
                          {r.requestedPayout ? formatThousandsInText(r.requestedPayout) : "—"}
                        </TableCell>
                        <TableCell>
                          <RequestStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant={r.status === "pending" ? "default" : "outline"} size="sm" asChild>
                            <Link to={`/dashboard/admin/payroll/instructor-request/${r.id}`}>Review</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tuition" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <p className="mb-6 text-sm text-slate-600 max-w-2xl">
              Student tuition rows for reference when validating instructor payroll. Use Payments & reminders to chase
              unpaid invoices.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-6">
              <Input
                placeholder="Search student, class, lecturer, invoice…"
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
              {hasActiveTuitionFilters ? (
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
                    {filteredPayments.length} payment row(s) total · {totalsByClass.length} class section(s) with
                    activity
                  </p>
                </CardContent>
              </Card>
            </div>

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
          </TabsContent>

          <TabsContent value="proof" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <p className="mb-6 text-sm text-slate-600 max-w-2xl">
              Log of bank transfer proof recorded after you pay an instructor. Instructors are notified when proof is
              saved. Approve the payroll request first on the Instructor requests tab.
            </p>

            <div className="mb-4 max-w-md">
              <Input
                placeholder="Search class, course, instructor, email…"
                value={proofSearch}
                onChange={(e) => setProofSearch(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Submitted</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="min-w-[200px]">Summary</TableHead>
                    <TableHead className="min-w-[140px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proofRowsFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                        {proofRows.length === 0
                          ? "No payout proof recorded yet. After approving a request and paying the instructor, record proof from the submission detail page."
                          : "No rows match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    proofRowsFiltered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatSubmittedShort(r.submittedAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">{r.classSection}</TableCell>
                        <TableCell className="text-sm text-slate-700">{r.course}</TableCell>
                        <TableCell className="text-sm text-slate-700">{r.instructorName}</TableCell>
                        <TableCell className="text-xs text-slate-600">{r.instructorEmail ?? "—"}</TableCell>
                        <TableCell className="text-xs text-slate-700 max-w-xs">{r.summary}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px]">{r.notesPreview ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
