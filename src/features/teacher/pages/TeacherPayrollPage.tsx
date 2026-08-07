import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Search } from "@/lib/icons";
import { toast } from "sonner";
import { useAuthSession } from "@/features/auth/context";
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
  type ClassPayrollAggregate,
} from "@/features/payroll/classPayrollAggregate";
import { getInstructorRevenueShare } from "@/features/payroll/instructorRevenueShareStorage";
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
  const { t } = useTranslation();
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
        {t("teacher.payroll.submissionStatus.approved")}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
        {t("teacher.payroll.submissionStatus.notApproved")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      {t("teacher.payroll.submissionStatus.pending")}
    </span>
  );
}

function StudentPayrollStatusBadge({ status }: { status: PayrollClassStudentResponse["status"] }) {
  const { t } = useTranslation();
  if (status === "enrolled") {
    return (
      <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        {t("teacher.payroll.status.enrolled")}
      </span>
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

function payrollRequestStatusBadge(
  latest: InstructorPayrollRequestRecord | undefined,
  hasPending: boolean,
  t: (key: string) => string,
) {
  if (hasPending) {
    return {
      label: t("teacher.payroll.requestStatus.pendingReview"),
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  if (latest?.status === "approved") {
    return {
      label: latest.resolvedAt
        ? `${t("teacher.payroll.requestStatus.approved")} · ${new Date(latest.resolvedAt).toLocaleDateString()}`
        : t("teacher.payroll.requestStatus.approved"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }
  if (latest?.status === "rejected") {
    return {
      label: latest.resolvedAt
        ? `${t("teacher.payroll.requestStatus.declined")} · ${new Date(latest.resolvedAt).toLocaleDateString()}`
        : t("teacher.payroll.requestStatus.declined"),
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }
  return {
    label: t("teacher.payroll.requestStatus.ready"),
    className: "border-border bg-muted text-foreground",
  };
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
  const payrollTabTriggerClass =
    "rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-teal-700 data-[state=active]:bg-transparent data-[state=active]:text-teal-800 data-[state=active]:shadow-none";

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 lg:px-6 md:gap-6 md:py-6">
      <Link
        to="/dashboard/teacher"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {t("teacherSettings.backToDashboard")}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("teacher.payroll.title")}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">{t("teacher.payroll.subtitle")}</p>
      </div>

      <Tabs defaultValue="payroll" className="min-w-0 w-full">
        <TabsList className="mb-0 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="payroll" className={payrollTabTriggerClass}>
            {t("teacher.payroll.tabs.payroll")}
          </TabsTrigger>
          <TabsTrigger value="submissions" className={payrollTabTriggerClass}>
            {t("teacher.payroll.tabs.submissions")}
            {pendingSubmissionCount > 0 ? (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-950">
                {pendingSubmissionCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="mt-6 min-w-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{t("teacher.payroll.summary.classes")}</p>
              <p className="text-xs text-muted-foreground">
                {t("teacher.payroll.summary.paymentRows", { count: totalPaymentRows })}
                {" · "}
                {t("teacher.payroll.summary.classesCount", { count: filteredClassCards.length })}
                {totals.length > 0 ? (
                  <>
                    {" · "}
                    {t("teacher.payroll.summary.totalInView")}{" "}
                    {totals.map((line) => line.formatted).join(", ")}
                  </>
                ) : null}
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("teacher.payroll.searchPlaceholder")}
                className="h-9 bg-background pl-9"
              />
            </div>
          </div>

          {missingProfile ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {t("teacher.payroll.empty.signIn")}
            </div>
          ) : filteredClassCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {coursesLoading
                ? t("teacher.payroll.empty.loading")
                : classCardModels.length > 0
                  ? t("teacher.payroll.empty.noMatch")
                  : t("teacher.payroll.empty.noClasses")}
            </div>
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted hover:bg-muted">
                      <TableHead className="w-10" />
                      <TableHead>{t("teacher.payroll.table.class")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        {t("teacher.payroll.table.students")}
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        {t("teacher.payroll.table.invoices")}
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        {t("teacher.payroll.table.totalTuition")}
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        {t("teacher.payroll.table.yourShare")}
                      </TableHead>
                      <TableHead className="whitespace-nowrap">{t("teacher.payroll.table.request")}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        {t("teacher.payroll.table.action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClassCards.map((cls) => {
                      const ck = classCardKey(cls.className, cls.course);
                      const aggBase = classAggregateFromPayroll(cls);
                      const payrollEmail = emailNorm || cls.lecturerEmail || aggBase.lecturerEmail;
                      const agg =
                        payrollEmail && aggBase.lecturerEmail !== payrollEmail
                          ? { ...aggBase, lecturerEmail: payrollEmail }
                          : aggBase;
                      const studentRows = cls.students;
                      const totalStudents = studentRows.length > 0 ? studentRows.length : cls.enrollmentCount;
                      const paidCount = agg.paidCount;
                      const unpaidCount = agg.unpaidCount;
                      const enrolledLines = currencyMapToFormattedLines(new Map([[cls.currency, cls.totalTuition]]));
                      const revenueSplit = estimateInstructorAndPlatformSplitLines(
                        new Map([[cls.currency, cls.totalTuition]]),
                        emailNorm || cls.lecturerEmail,
                      );
                      const summaryText = buildPayrollSummaryText(agg);
                      const instructorShare = getInstructorRevenueShare(emailNorm || cls.lecturerEmail);
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
                      const statusBadge = payrollRequestStatusBadge(latest, hasPending, t);
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
                          <TableRow className="align-top hover:bg-muted/20">
                            <TableCell className="py-3">
                              <button
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? t("teacher.payroll.expandAria.hide")
                                    : t("teacher.payroll.expandAria.show")
                                }
                                onClick={() => setExpandedClassKey(isExpanded ? null : ck)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="min-w-[160px] py-3">
                              <p className="font-medium text-foreground">
                                {cls.className}
                                {cls.substituteCoverage ? (
                                  <span className="ml-2 inline-flex rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                                    Substitute
                                  </span>
                                ) : null}
                              </p>
                              {latest?.status === "rejected" && latest.adminNote ? (
                                <p
                                  className="mt-1 line-clamp-2 text-[11px] leading-snug text-red-700"
                                  title={latest.adminNote}
                                >
                                  {t("teacher.payroll.adminNotePrefix", { note: latest.adminNote })}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="py-3 text-right tabular-nums text-foreground">
                              {totalStudents}
                            </TableCell>
                            <TableCell className="py-3 text-right text-sm text-muted-foreground whitespace-nowrap">
                              {t("teacher.payroll.invoiceSummary", {
                                paid: paidCount,
                                unpaid: unpaidCount,
                              })}
                            </TableCell>
                            <TableCell className="py-3 text-right tabular-nums text-foreground whitespace-nowrap">
                              {enrolledLines.length === 0
                                ? "—"
                                : enrolledLines.map((l) => <p key={l.currency}>{l.formatted}</p>)}
                            </TableCell>
                            <TableCell className="py-3 text-right tabular-nums font-medium text-teal-800 whitespace-nowrap">
                              {revenueSplit.instructorLines.length === 0
                                ? "—"
                                : revenueSplit.instructorLines.map((l) => (
                                    <p key={l.currency}>{l.formatted}</p>
                                  ))}
                              <p className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                                {t("teacher.payroll.sharePercent", {
                                  percent: Math.round(instructorShare * 100),
                                })}
                              </p>
                            </TableCell>
                            <TableCell className="py-3">
                              <span
                                className={`inline-flex max-w-[10rem] items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
                              >
                                {statusBadge.label}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                {canViewPayout ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 whitespace-nowrap text-xs"
                                    onClick={() =>
                                      setPayoutDetailsTarget({
                                        classSection: cls.className,
                                        course: cls.course,
                                      })
                                    }
                                  >
                                    {t("teacher.payroll.actions.viewPayout")}
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 whitespace-nowrap bg-teal-700 text-xs hover:bg-teal-800"
                                  onClick={() => {
                                    initFormIfMissing(ck);
                                    setOpenSubmitKey(ck);
                                  }}
                                >
                                  {t("teacher.payroll.actions.submitPayroll")}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow key={`${ck}-payments`} className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={8} className="px-4 py-4 sm:px-5">
                                <div className="overflow-hidden rounded-xl border border-border bg-background">
                                  <div className="border-b border-border px-4 py-3">
                                    <p className="text-sm font-medium text-foreground">
                                      {t("teacher.payroll.enrolledSection.title")}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{summaryText}</p>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted hover:bg-muted">
                                          <TableHead>{t("teacher.payroll.enrolledTable.student")}</TableHead>
                                          <TableHead>{t("teacher.payroll.enrolledTable.amount")}</TableHead>
                                          <TableHead>{t("teacher.payroll.enrolledTable.status")}</TableHead>
                                          <TableHead>{t("teacher.payroll.enrolledTable.due")}</TableHead>
                                          <TableHead>{t("teacher.payroll.enrolledTable.paid")}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {coursesLoading ? (
                                          <TableRow>
                                            <TableCell
                                              colSpan={5}
                                              className="py-6 text-center text-sm text-muted-foreground"
                                            >
                                              {t("teacher.payroll.enrolledTable.loading")}
                                            </TableCell>
                                          </TableRow>
                                        ) : studentRows.length === 0 ? (
                                          <TableRow>
                                            <TableCell
                                              colSpan={5}
                                              className="py-6 text-center text-sm text-muted-foreground"
                                            >
                                              {t("teacher.payroll.enrolledTable.empty")}
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          studentRows.map((student) => (
                                            <TableRow key={student.id}>
                                              <TableCell className="font-medium text-foreground">
                                                <div className="min-w-0 max-w-[240px]">
                                                  <p className="truncate">{student.fullName}</p>
                                                  <p className="truncate text-xs text-muted-foreground">
                                                    {student.email}
                                                  </p>
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
                                              <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                                                {student.dueDate ?? "—"}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
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
                            instructorEmail={emailNorm || cls.lecturerEmail}
                            onSubmit={() => void onSubmitRequest(cls.courseId, cls.className, cls.course, summaryText)}
                          />
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-6 min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("teacher.payroll.submissions.title")}
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {t("teacher.payroll.submissions.subtitle")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/teacher/notifications">
                {t("teacher.payroll.submissions.viewNotifications")}
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {t("teacher.payroll.submissions.stats.total")}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {sortedSubmissions.length}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {t("teacher.payroll.submissions.stats.pending")}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {pendingSubmissionCount}
              </span>
            </div>
            <div className="relative w-full max-w-xs sm:ml-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder={t("teacher.payroll.submissions.searchPlaceholder")}
                className="h-9 bg-background pl-9"
              />
            </div>
          </div>

          {sortedSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {coursesLoading
                ? t("teacher.payroll.submissions.empty.loading")
                : t("teacher.payroll.submissions.empty.none")}
            </div>
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted hover:bg-muted">
                      <TableHead>{t("teacher.payroll.submissions.table.class")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.period")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.requested")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.status")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.bankReceipt")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.submitted")}</TableHead>
                      <TableHead>{t("teacher.payroll.submissions.table.adminNote")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubmissions.map((r) => {
                      const matchedCourse = resolveSubmissionCourse(r, instructorCourses);
                      const classTitle =
                        matchedCourse?.title.trim() || r.classSection.trim() || r.course.trim();
                      const classSubtitle = matchedCourse
                        ? t("teacher.payroll.submissions.enrolledSubtitle", {
                            count: matchedCourse.enrollmentCount ?? 0,
                          })
                        : null;
                      const submissionProof = resolvePayrollProofBundle(
                        proofMap,
                        r.classSection,
                        r.course,
                      );
                      const canViewTransfer = canInstructorViewTransferProof(r, submissionProof);
                      return (
                        <TableRow key={r.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-foreground">
                            <div className="min-w-0">
                              <p className="truncate">{classTitle}</p>
                              {classSubtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{classSubtitle}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.periodLabel || "—"}</TableCell>
                          <TableCell className="tabular-nums text-foreground">
                            {r.requestedPayout ? formatThousandsInText(r.requestedPayout) : "—"}
                          </TableCell>
                          <TableCell>
                            <SubmissionStatusPill status={r.status} />
                          </TableCell>
                          <TableCell>
                            {canViewTransfer || r.status === "approved" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-teal-800 hover:bg-teal-50 hover:text-teal-900"
                                onClick={() =>
                                  setPayoutDetailsTarget({
                                    classSection: r.classSection,
                                    course: r.course,
                                  })
                                }
                              >
                                {canViewTransfer
                                  ? t("teacher.payroll.submissions.viewReceipt")
                                  : t("teacher.payroll.submissions.viewStatus")}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(r.submittedAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="line-clamp-2">{r.adminNote?.trim() || "—"}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
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
  );
}
