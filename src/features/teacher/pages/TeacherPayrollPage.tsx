import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Search } from "@/lib/icons";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import {
  canInstructorViewTransferProof,
  resolvePayrollProofBundle,
  usePayrollProofMap,
} from "@/features/admin/data/adminPayrollProofStore";
import { eduhubPayroll } from "@/api/eduhubClient";
import type { PayrollClassStudentResponse, PayrollClassSummaryResponse } from "@/api/eduhubTypes";
import {
  addToCurrencyMap,
  buildPayrollSummaryText,
  currencyMapToFormattedLines,
  estimateInstructorAndPlatformSplitLines,
  formatMoney,
  INSTRUCTOR_REVENUE_SHARE,
  type ClassPayrollAggregate,
} from "@/features/payroll/classPayrollAggregate";
import {
  instructorPayrollRequestDedupeKey,
  instructorPayrollRequestStore,
  useInstructorPayrollRequests,
  type InstructorPayrollRequestRecord,
} from "@/features/teacher/data/instructorPayrollRequestStore";
import { TeacherPayrollPayoutDetailsDialog } from "@/features/teacher/components/TeacherPayrollPayoutDetailsDialog";
import { TeacherPayrollSubmitDialog } from "@/features/teacher/components/TeacherPayrollSubmitDialog";
import {
  emptyTeacherPayrollForm,
  type TeacherPayrollFormFields,
} from "@/features/payroll/payrollScheduleEligibility";
import { formatThousandsInText } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type PayrollCourseRef = { id: string; title: string; enrollmentCount: number };

function classAggregateFromPayroll(cls: PayrollClassSummaryResponse): ClassPayrollAggregate {
  const paidByCurrency = new Map<string, number>();
  const outstandingByCurrency = new Map<string, number>();
  let paidCount = 0;
  let unpaidCount = 0;
  for (const s of cls.students) {
    if (s.status === "paid") {
      paidCount += 1;
      if (s.amount != null && s.amount > 0) addToCurrencyMap(paidByCurrency, s.currency, s.amount);
    } else if (s.status === "pending" || s.status === "overdue") {
      unpaidCount += 1;
      if (s.amount != null && s.amount > 0) addToCurrencyMap(outstandingByCurrency, s.currency, s.amount);
    }
  }
  return {
    className: cls.className,
    course: cls.course,
    lecturerName: cls.lecturerName,
    lecturerEmail: cls.lecturerEmail?.trim() || undefined,
    paymentCount: cls.students.length,
    paidCount,
    unpaidCount,
    paidByCurrency,
    outstandingByCurrency,
  };
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function SubmissionStatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-900">Not approved</span>;
  }
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Pending</span>;
}

function StudentPayrollStatusBadge({ status }: { status: PayrollClassStudentResponse["status"] }) {
  const { t } = useTranslation();
  if (status === "enrolled") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{t("teacher.roster.tabs.enrolled")}</span>
    );
  }
  return <PaymentStatusBadge status={status} />;
}

function courseTitleMatchesClass(title: string, classSection: string, course: string): boolean {
  const norm = title.trim().toLowerCase();
  return classSection.trim().toLowerCase() === norm || course.trim().toLowerCase() === norm;
}

function resolveSubmissionCourse(
  submission: InstructorPayrollRequestRecord,
  instructorCourses: PayrollCourseRef[],
): PayrollCourseRef | undefined {
  return instructorCourses.find((course) =>
    courseTitleMatchesClass(course.title, submission.classSection, submission.course),
  );
}

function payrollRequestStatusBadge(latest: InstructorPayrollRequestRecord | undefined, hasPending: boolean) {
  if (hasPending) {
    return { label: "Pending review", className: "bg-amber-100 text-amber-900 ring-amber-200/80" };
  }
  if (latest?.status === "approved") {
    return {
      label: latest.resolvedAt ? `Approved · ${new Date(latest.resolvedAt).toLocaleDateString()}` : "Approved",
      className: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
    };
  }
  if (latest?.status === "rejected") {
    return {
      label: latest.resolvedAt ? `Declined · ${new Date(latest.resolvedAt).toLocaleDateString()}` : "Declined",
      className: "bg-red-100 text-red-900 ring-red-200/80",
    };
  }
  return { label: "Ready", className: "bg-slate-100 text-slate-700 ring-slate-200/90" };
}

function latestRequestForClass(
  requests: InstructorPayrollRequestRecord[],
  classSection: string,
  course: string,
  emailNorm: string,
  instructorName: string,
) {
  const key = instructorPayrollRequestDedupeKey(classSection, course, emailNorm, instructorName);
  const relevant = requests.filter(
    (r) =>
      instructorPayrollRequestDedupeKey(r.classSection, r.course, r.instructorEmailNorm, r.instructorName) === key,
  );
  relevant.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return relevant[0];
}

export default function TeacherPayrollPage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [search, setSearch] = useState("");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [payrollClasses, setPayrollClasses] = useState<PayrollClassSummaryResponse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [openSubmitKey, setOpenSubmitKey] = useState<string | null>(null);
  const [payoutDetailsTarget, setPayoutDetailsTarget] = useState<{
    classSection: string;
    course: string;
  } | null>(null);
  const [expandedClassKey, setExpandedClassKey] = useState<string | null>(null);
  const [formByClass, setFormByClass] = useState<Record<string, TeacherPayrollFormFields>>({});

  const updateForm = (ck: string, patch: Partial<TeacherPayrollFormFields>) => {
    setFormByClass((prev) => ({
      ...prev,
      [ck]: {
        ...emptyTeacherPayrollForm(),
        ...(prev[ck] ?? {}),
        ...patch,
      },
    }));
  };

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setCoursesLoading(true);
      if (!user.id) {
        if (!cancelled) {
          setPayrollClasses([]);
          setCoursesLoading(false);
        }
        return;
      }
      try {
        const rows = await eduhubPayroll.getClasses();
        if (!cancelled) setPayrollClasses(rows ?? []);
      } catch {
        if (!cancelled) setPayrollClasses([]);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const emailNorm = user.email.trim().toLowerCase();
  const nameNorm = (user.name ?? "").trim().toLowerCase();
  const instructorLabel = user.name?.trim() || "Instructor";

  const payrollRequests = useInstructorPayrollRequests();
  const proofMap = usePayrollProofMap();

  const instructorCourses = useMemo<PayrollCourseRef[]>(() => {
    if (coursesLoading) return [];
    return payrollClasses.map((c) => ({ id: c.courseId, title: c.className, enrollmentCount: c.enrollmentCount }));
  }, [payrollClasses, coursesLoading]);

  const classCardModels = useMemo(() => {
    if (coursesLoading) return [] as PayrollClassSummaryResponse[];
    return payrollClasses.filter((c) => c.className?.trim());
  }, [payrollClasses, coursesLoading]);

  const filteredClassCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classCardModels;
    return classCardModels.filter((cls) => {
      if ([cls.className, cls.course].join(" ").toLowerCase().includes(q)) return true;
      return cls.students.some((s) =>
        [s.fullName, s.email, s.status, formatMoney(s.amount ?? 0, s.currency)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [classCardModels, search]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    filteredClassCards.forEach((cls) => byCurrency.set(cls.currency, (byCurrency.get(cls.currency) ?? 0) + cls.totalTuition));
    return Array.from(byCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      formatted: formatMoney(amount, currency),
    }));
  }, [filteredClassCards]);

  const totalPaymentRows = useMemo(
    () => filteredClassCards.reduce((sum, cls) => sum + cls.students.length, 0),
    [filteredClassCards],
  );

  const classCardKey = (className: string, course: string) => `${className}\t${course}`;

  const mySubmissions = useMemo(() => {
    return payrollRequests.filter((r) => {
      const re = r.instructorEmailNorm.trim().toLowerCase();
      const instructorMatch =
        (emailNorm && re && re === emailNorm) ||
        (!re && nameNorm && r.instructorName.trim().toLowerCase() === nameNorm);
      if (!instructorMatch) return false;
      if (coursesLoading || instructorCourses.length === 0) return false;
      return resolveSubmissionCourse(r, instructorCourses) != null;
    });
  }, [payrollRequests, emailNorm, nameNorm, instructorCourses, coursesLoading]);

  const filteredSubmissions = useMemo(() => {
    const q = submissionSearch.trim().toLowerCase();
    if (!q) return mySubmissions;
    return mySubmissions.filter((r) => {
      const hay = [
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
  }, [mySubmissions, submissionSearch]);

  const sortedSubmissions = useMemo(
    () => [...filteredSubmissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [filteredSubmissions],
  );

  const pendingSubmissionCount = useMemo(
    () => sortedSubmissions.filter((r) => r.status === "pending").length,
    [sortedSubmissions],
  );

  const initFormIfMissing = (ck: string) => {
    setFormByClass((prev) => {
      if (prev[ck]) return prev;
      return {
        ...prev,
        [ck]: emptyTeacherPayrollForm(),
      };
    });
  };

  const onSubmitRequest = async (courseId: string, className: string, course: string, summary: string) => {
    const ck = classCardKey(className, course);
    initFormIfMissing(ck);
    const f = formByClass[ck];
    if (!f) return;
    if (!f.periodLabel.trim()) {
      toast.error("Select a schedule period", { description: "Choose the month from your class schedule." });
      return;
    }
    const instructorNotes = f.instructorNotes.trim();
    const result = await instructorPayrollRequestStore.submit({
      courseId,
      classSection: className,
      course,
      instructorName: instructorLabel,
      instructorEmailNorm: emailNorm,
      periodLabel: f.periodLabel,
      sessionsTaught: f.sessionsTaught,
      requestedPayout: f.requestedPayout,
      payoutDetails: f.payoutDetails,
      summary,
      instructorNotes,
    });
    if (!result.ok) {
      toast.error("Could not submit", { description: "reason" in result ? result.reason : "Please try again." });
      return;
    }
    toast.success("Payroll request sent", { description: "An admin will review it on the Payroll dashboard." });
    setOpenSubmitKey(null);
  };

  const missingProfile = !emailNorm && !nameNorm && user.role !== "teacher";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div className="container mx-auto px-6 max-w-7xl">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacherSettings.backToDashboard")}</Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: "0.5px" }}>{t("teacherNav.payroll")}</h1>
            <p className="text-foreground/60 text-sm mt-1 max-w-2xl">
              Your classes and linked student payments. Submit a payroll request per class for admin approval, then track
              submissions on the My submissions tab.
            </p>
          </div>

          <Tabs defaultValue="payroll" className="w-full">
            <TabsList className="mb-6 h-11 w-full sm:w-auto justify-start bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <TabsTrigger value="payroll" className="rounded-lg px-4 data-[state=active]:shadow-sm">{t("teacherNav.payroll")}</TabsTrigger>
              <TabsTrigger value="submissions" className="rounded-lg px-4 data-[state=active]:shadow-sm">
                My submissions
                {pendingSubmissionCount > 0 ? (
                  <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-950">
                    {pendingSubmissionCount}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payroll" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="rounded-2xl border-slate-200/90 shadow-sm overflow-hidden mb-12">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Your classes</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {totalPaymentRows} payment row{totalPaymentRows === 1 ? "" : "s"} ·{" "}
                  {filteredClassCards.length} class{filteredClassCards.length === 1 ? "" : "es"}
                  {totals.length > 0 ? (
                    <>
                      {" "}
                      · Total in view{" "}
                      {totals.map((t) => t.formatted).join(", ")}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="w-full sm:max-w-xs">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search class, student, invoice…"
                  className="bg-white"
                />
              </div>
            </div>

            {missingProfile ? (
              <p className="px-6 py-8 text-sm text-slate-500">Sign in with a profile so we can match your classes.</p>
            ) : filteredClassCards.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                {coursesLoading
                  ? "Loading your classes…"
                  : classCardModels.length > 0
                    ? "No classes match your search."
                    : "No active classes yet. Create a class in My Class, then come back here to submit payroll."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="w-10" />
                      <TableHead>{t("teacher.dashboard.classesTable.header.class")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t("teacher.dashboard.classesTable.header.students")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Invoices</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total tuition</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Your share</TableHead>
                      <TableHead className="whitespace-nowrap">Request</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClassCards.map((cls) => {
                      const ck = classCardKey(cls.className, cls.course);
                      const agg = classAggregateFromPayroll(cls);
                      const studentRows = cls.students;
                      const totalStudents = studentRows.length > 0 ? studentRows.length : cls.enrollmentCount;
                      const paidCount = agg.paidCount;
                      const unpaidCount = agg.unpaidCount;
                      const enrolledLines = currencyMapToFormattedLines(new Map([[cls.currency, cls.totalTuition]]));
                      const revenueSplit = estimateInstructorAndPlatformSplitLines(new Map([[cls.currency, cls.totalTuition]]));
                      const summaryText = buildPayrollSummaryText(agg);
                      const paidStudentCount = paidCount;
                      const paymentCurrency = cls.currency;
                      const paidPaymentAmounts = studentRows
                        .filter((row) => row.status === "paid" && row.amount != null)
                        .map((row) => row.amount as number);
                      const latest = latestRequestForClass(
                        payrollRequests,
                        cls.className,
                        cls.course,
                        emailNorm,
                        instructorLabel,
                      );
                      const hasPending = latest?.status === "pending";
                      const statusBadge = payrollRequestStatusBadge(latest, hasPending);
                      const classPayrollRequests = payrollRequests.filter(
                        (request) =>
                          instructorPayrollRequestDedupeKey(
                            request.classSection,
                            request.course,
                            request.instructorEmailNorm,
                            request.instructorName,
                          ) ===
                          instructorPayrollRequestDedupeKey(
                            cls.className,
                            cls.course,
                            emailNorm,
                            instructorLabel,
                          ),
                      );
                      const isExpanded = expandedClassKey === ck;
                      const proofBundle = resolvePayrollProofBundle(proofMap, cls.className, cls.course);
                      const canViewTransfer = canInstructorViewTransferProof(latest, proofBundle);
                      const canViewPayout =
                        latest?.status === "approved" ||
                        canViewTransfer ||
                        Boolean(proofBundle?.informationNotes?.trim());

                      return (
                        <Fragment key={ck}>
                          <TableRow className="align-top">
                            <TableCell className="py-4">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Hide student payments" : "Show student payments"}
                                onClick={() => setExpandedClassKey(isExpanded ? null : ck)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="py-4 min-w-[160px]">
                              <p className="font-medium text-slate-900">
                                {cls.className}
                                {cls.substituteCoverage ? (
                                  <span className="ml-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                                    Substitute
                                  </span>
                                ) : null}
                              </p>
                              {latest?.status === "rejected" && latest.adminNote ? (
                                <p className="mt-1 text-[11px] leading-snug text-red-700 line-clamp-2" title={latest.adminNote}>
                                  Admin: {latest.adminNote}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="py-4 text-right tabular-nums text-slate-900">
                              {totalStudents}
                            </TableCell>
                            <TableCell className="py-4 text-right text-sm text-slate-700 whitespace-nowrap">
                              <span className="tabular-nums">{paidCount} paid</span>
                              <span className="text-slate-400"> · </span>
                              <span className="tabular-nums">{unpaidCount} unpaid</span>
                            </TableCell>
                            <TableCell className="py-4 text-right tabular-nums text-slate-900 whitespace-nowrap">
                              {enrolledLines.length === 0 ? (
                                "—"
                              ) : (
                                enrolledLines.map((l) => <p key={l.currency}>{l.formatted}</p>)
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-right tabular-nums font-medium text-emerald-800 whitespace-nowrap">
                              {revenueSplit.instructorLines.length === 0 ? (
                                "—"
                              ) : (
                                revenueSplit.instructorLines.map((l) => <p key={l.currency}>{l.formatted}</p>)
                              )}
                              <p className="mt-0.5 text-[10px] font-normal text-slate-500">
                                {Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% of tuition
                              </p>
                            </TableCell>
                            <TableCell className="py-4">
                              <span
                                className={`inline-flex max-w-[140px] items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusBadge.className}`}
                              >
                                {statusBadge.label}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                {canViewPayout ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="whitespace-nowrap border-[#3954d0]/35 text-[#3954d0] hover:bg-[#3954d0]/5"
                                    onClick={() =>
                                      setPayoutDetailsTarget({
                                        classSection: cls.className,
                                        course: cls.course,
                                      })
                                    }
                                  >
                                    View payout
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-[#3954d0] hover:bg-[#2f46b3] whitespace-nowrap"
                                  onClick={() => {
                                    initFormIfMissing(ck);
                                    setOpenSubmitKey(ck);
                                  }}
                                >
                                  Submit payroll
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow key={`${ck}-payments`} className="bg-slate-50/50 hover:bg-slate-50/50">
                              <TableCell colSpan={8} className="px-4 py-4 sm:px-6">
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                  <div className="border-b border-slate-100 px-4 py-3">
                                    <p className="text-sm font-medium text-slate-900">{t("teacher.roster.enrolled.title")}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{summaryText}</p>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                          <TableHead>{t("teacher.assignments.submissions.table.student")}</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>{t("common.status")}</TableHead>
                                          <TableHead>Due</TableHead>
                                          <TableHead>Paid</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {coursesLoading ? (
                                          <TableRow>
                                            <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                                              Loading enrolled students…
                                            </TableCell>
                                          </TableRow>
                                        ) : studentRows.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                                              No enrolled students for this class yet.
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          studentRows.map((student) => (
                                            <TableRow key={student.id}>
                                              <TableCell className="font-medium text-slate-900">
                                                <div className="min-w-0 max-w-[240px]">
                                                  <p className="truncate">{student.fullName}</p>
                                                  <p className="text-xs text-slate-500 truncate">{student.email}</p>
                                                </div>
                                              </TableCell>
                                              <TableCell className="tabular-nums whitespace-nowrap">
                                                {student.amount != null && student.amount > 0
                                                  ? formatMoney(student.amount, student.currency)
                                                  : "—"}
                                              </TableCell>
                                              <TableCell>
                                                <StudentPayrollStatusBadge status={student.status} />
                                              </TableCell>
                                              <TableCell className="tabular-nums text-slate-700 whitespace-nowrap">
                                                {student.dueDate ?? "—"}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-slate-700 whitespace-nowrap">
                                                {student.paidAt ?? "—"}
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                          <TeacherPayrollSubmitDialog
                            key={`${ck}-dialog`}
                            open={openSubmitKey === ck}
                            onOpenChange={(open) => setOpenSubmitKey(open ? ck : null)}
                            className={cls.className}
                            course={cls.course}
                            formKey={ck}
                            form={formByClass[ck]}
                            onFormChange={(patch) => updateForm(ck, patch)}
                            summaryText={summaryText}
                            enrolledStudentCount={studentRows.length}
                            paidStudentCount={paidStudentCount}
                            paymentCurrency={paymentCurrency}
                            paidPaymentAmounts={paidPaymentAmounts}
                            existingClassRequests={classPayrollRequests}
                            onSubmit={() => void onSubmitRequest(cls.courseId, cls.className, cls.course, summaryText)}
                          />
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
            </TabsContent>

            <TabsContent value="submissions" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <section className="mb-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">My submissions</h2>
                <p className="text-foreground/60 text-sm mt-1 max-w-2xl">
                  Track your monthly submissions (pending / approved / not approved). After admin submits payout proof,{" "}
                  <span className="text-foreground/75">Bank transfer receipt</span> shows here and you get a notification.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full w-full sm:w-auto">
                <Link to="/dashboard/teacher/notifications">View notifications</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Total submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-slate-900 tabular-nums">{sortedSubmissions.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-slate-900 tabular-nums">{pendingSubmissionCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
                    <Input
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      placeholder="Class, period, status…"
                      className="bg-white pl-9"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {sortedSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                {coursesLoading
                  ? "Loading submissions for your classes…"
                  : instructorCourses.length === 0
                    ? "Create a class in My Class, then submit payroll from the Payroll tab to see submissions here."
                    : "No submissions yet for your classes. Submit payroll from the Payroll tab when you are ready."}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>{t("teacher.dashboard.classesTable.header.class")}</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>Bank receipt</TableHead>
                      <TableHead>{t("teacher.assignments.submissions.table.submitted")}</TableHead>
                      <TableHead>Admin note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubmissions.map((r) => {
                      const matchedCourse = resolveSubmissionCourse(r, instructorCourses);
                      const classTitle = matchedCourse?.title.trim() || r.classSection.trim() || r.course.trim();
                      const classSubtitle = matchedCourse ? `${matchedCourse.enrollmentCount ?? 0} enrolled` : null;
                      const submissionProof = resolvePayrollProofBundle(proofMap, r.classSection, r.course);
                      const canViewTransfer = canInstructorViewTransferProof(r, submissionProof);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-slate-900">
                            <div className="min-w-0">
                              <p className="truncate">{classTitle}</p>
                              {classSubtitle ? (
                                <p className="text-xs text-slate-500 truncate capitalize">{classSubtitle}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{r.periodLabel || "—"}</TableCell>
                          <TableCell className="text-slate-700 tabular-nums">
                            {r.requestedPayout ? formatThousandsInText(r.requestedPayout) : "—"}
                          </TableCell>
                          <TableCell>
                            <SubmissionStatusPill status={r.status} />
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {canViewTransfer || r.status === "approved" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-[#3954d0] hover:bg-[#3954d0]/5 hover:text-[#3954d0]"
                                onClick={() =>
                                  setPayoutDetailsTarget({
                                    classSection: r.classSection,
                                    course: r.course,
                                  })
                                }
                              >
                                {canViewTransfer ? "View receipt" : "View status"}
                              </Button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">{formatRelativeTime(r.submittedAt)}</TableCell>
                          <TableCell className="text-slate-600">
                            <span className="line-clamp-2">{r.adminNote?.trim() || "—"}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
            </TabsContent>
          </Tabs>

          {payoutDetailsTarget ? (
            <TeacherPayrollPayoutDetailsDialog
              open
              onOpenChange={(open) => {
                if (!open) setPayoutDetailsTarget(null);
              }}
              classSection={payoutDetailsTarget.classSection}
              course={payoutDetailsTarget.course}
              submission={latestRequestForClass(
                payrollRequests,
                payoutDetailsTarget.classSection,
                payoutDetailsTarget.course,
                emailNorm,
                instructorLabel,
              )}
              proof={resolvePayrollProofBundle(
                proofMap,
                payoutDetailsTarget.classSection,
                payoutDetailsTarget.course,
              )}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
