import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { useEnrollmentInstallmentPayments } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { scheduleMonthOrdinalLabel } from "@/features/enrollment/enrollmentInstallmentPayments";
import { currencyMapToFormattedLines, formatMoney } from "@/features/payroll/classPayrollAggregate";
import { formatThousandsInText } from "@/lib/utils";
import { useInstructorPayrollRequests } from "@/features/teacher/data/instructorPayrollRequestStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
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

function TuitionStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
      Awaiting review
    </span>
  );
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
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parsePayrollTab(searchParams.get("tab"));

  const installmentPayments = useEnrollmentInstallmentPayments();
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
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [proofSearch, setProofSearch] = useState("");

  const setActiveTab = (tab: PayrollTab) => {
    setSearchParams(tab === "requests" ? {} : { tab }, { replace: true });
  };

  const classOptions = useMemo(() => {
    const names = new Set(installmentPayments.map((p) => p.courseTitle));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [installmentPayments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return installmentPayments.filter((p) => {
      if (classFilter !== "all" && p.courseTitle !== classFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        p.studentName,
        p.studentEmailNorm,
        p.courseTitle,
        p.lecturerName,
        p.lecturerEmail,
        p.status,
        formatMoney(p.amount, p.currency ?? "UZS"),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [installmentPayments, search, classFilter, statusFilter]);

  const collectedInView = useMemo(() => {
    const map = new Map<string, number>();
    filteredPayments.forEach((p) => {
      if (p.status !== "APPROVED") return;
      map.set(p.currency ?? "UZS", (map.get(p.currency ?? "UZS") ?? 0) + p.amount);
    });
    return currencyMapToFormattedLines(map);
  }, [filteredPayments]);
  const outstandingInView = useMemo(() => {
    const map = new Map<string, number>();
    filteredPayments.forEach((p) => {
      if (p.status !== "PENDING") return;
      map.set(p.currency ?? "UZS", (map.get(p.currency ?? "UZS") ?? 0) + p.amount);
    });
    return currencyMapToFormattedLines(map);
  }, [filteredPayments]);

  const paidRowCount = useMemo(
    () => filteredPayments.filter((p) => p.status === "APPROVED").length,
    [filteredPayments],
  );
  const unpaidRowCount = useMemo(
    () => filteredPayments.filter((p) => p.status === "PENDING").length,
    [filteredPayments],
  );

  const classSectionsWithActivity = useMemo(
    () => new Set(filteredPayments.map((p) => p.courseTitle)).size,
    [filteredPayments],
  );

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
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.payroll")}
          description={t("admin.payroll.description")}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/admin/payments">{t("admin.dashboard.quickActions.paymentsReminders")}</Link>
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
              <p className="font-medium text-slate-900">{t("admin.payroll.howItWorks.title")}</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-slate-600">
                <li>{t("admin.payroll.howItWorks.step1")}</li>
                <li>Approve or reject the instructor&apos;s requested payout.</li>
                <li>{t("admin.payroll.howItWorks.step3")}</li>
              </ol>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">{t("admin.shared.pendingReview")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-amber-900">{pendingPayrollCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">{t("admin.shared.approved")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-emerald-800">{approvedPayrollCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">{t("admin.payroll.stats.allSubmissions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{payrollRequests.length}</p>
                </CardContent>
              </Card>
            </div>

            {pendingPayrollCount > 0 ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <span className="font-semibold">{pendingPayrollCount} submission{pendingPayrollCount === 1 ? "" : "s"}</span>{" "}
                waiting for your decision. Filter by <span className="font-medium">{t("admin.shared.pendingReview")}</span> or open any row
                to review.
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4">
              <Input
                placeholder={t("admin.payroll.requests.searchPlaceholder")}
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="max-w-md bg-white"
              />
              <Select
                value={requestStatusFilter}
                onValueChange={(v) => setRequestStatusFilter(v as typeof requestStatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
                  <SelectItem value="pending">{t("admin.shared.pendingReview")}</SelectItem>
                  <SelectItem value="approved">{t("admin.shared.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("admin.shared.notApproved")}</SelectItem>
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
                      <TableHead className="whitespace-nowrap">{t("admin.shared.submitted")}</TableHead>
                      <TableHead>{t("admin.shared.instructor")}</TableHead>
                      <TableHead>{t("admin.shared.class")}</TableHead>
                      <TableHead className="whitespace-nowrap">{t("admin.installmentPayments.scheduleMonth")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t("admin.payroll.requests.table.requested")}</TableHead>
                      <TableHead className="whitespace-nowrap">{t("common.status")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t("admin.payroll.requests.table.action")}</TableHead>
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
                            <Link to={`/dashboard/admin/payroll/instructor-request/${r.id}`}>{t("admin.shared.review")}</Link>
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
              Schedule-month tuition payments for reference when validating instructor payroll. Review and approve
              individual payments from{" "}
              <Link to="/dashboard/admin/installment-payments" className="text-[#3954d0] hover:underline">
                Schedule-month payments
              </Link>
              .
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-6">
              <Input
                placeholder={t("admin.payments.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md bg-white"
              />
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.shared.allClasses")}</SelectItem>
                  {classOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full sm:w-[160px] bg-white">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
                  <SelectItem value="PENDING">Awaiting review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
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
                  <CardTitle className="text-sm font-semibold text-slate-700">{t("admin.payroll.tuition.totalsTitle")}</CardTitle>
                  <p className="text-xs text-slate-500 font-normal mt-1">
                    Collected counts approved payments; outstanding is payments awaiting review that match your filters.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredPayments.length === 0 ? (
                    <p className="text-lg font-medium text-slate-500">{t("admin.installmentPayments.empty.noInView")}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-md border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">{t("admin.payroll.tuition.collected")}</p>
                        <CurrencyAmountLines lines={collectedInView} emptyLabel="—" />
                        <p className="text-xs text-emerald-800/90 mt-2 tabular-nums">{paidRowCount} paid row(s)</p>
                      </div>
                      <div className="rounded-md border border-amber-200/80 bg-amber-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 mb-1">{t("admin.payroll.tuition.outstanding")}</p>
                        <CurrencyAmountLines lines={outstandingInView} emptyLabel="—" />
                        <p className="text-xs text-amber-900/90 mt-2 tabular-nums">{unpaidRowCount} unpaid row(s)</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                    {filteredPayments.length} payment row(s) total · {classSectionsWithActivity} class section(s) with
                    activity
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>{t("admin.shared.student")}</TableHead>
                    <TableHead>{t("admin.shared.class")}</TableHead>
                    <TableHead>{t("admin.shared.lecturer")}</TableHead>
                    <TableHead>{t("admin.shared.amount")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>Schedule month</TableHead>
                    <TableHead>{t("admin.shared.paid")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        No payments match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="min-w-0">
                            <p className="truncate">{p.studentName}</p>
                            <p className="text-xs text-slate-500 truncate">{p.studentEmailNorm}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-800">{p.courseTitle}</TableCell>
                        <TableCell className="text-slate-700">{p.lecturerName}</TableCell>
                        <TableCell className="tabular-nums">{formatMoney(p.amount, p.currency ?? "UZS")}</TableCell>
                        <TableCell>
                          <TuitionStatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-700">{scheduleMonthOrdinalLabel(p.scheduleMonth)}</TableCell>
                        <TableCell className="tabular-nums text-slate-700">
                          {p.status === "APPROVED" && p.reviewedAt
                            ? new Date(p.reviewedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
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
                placeholder={t("admin.payroll.proof.searchPlaceholder")}
                value={proofSearch}
                onChange={(e) => setProofSearch(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>{t("admin.shared.submitted")}</TableHead>
                    <TableHead>{t("admin.shared.class")}</TableHead>
                    <TableHead>{t("admin.shared.course")}</TableHead>
                    <TableHead>{t("admin.shared.instructor")}</TableHead>
                    <TableHead>{t("admin.shared.email")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("admin.shared.summary")}</TableHead>
                    <TableHead className="min-w-[140px]">{t("admin.shared.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proofRowsFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                        {proofRows.length === 0
                          ? "No payout proof recorded yet. After approving a request and paying the instructor, record proof from the submission detail page."
                          : t("admin.payroll.proof.emptyNoMatch")}
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
